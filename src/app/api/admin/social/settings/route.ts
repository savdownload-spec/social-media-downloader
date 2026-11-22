import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { firstZodError, settingsInputSchema } from '@/lib/social/schemas';
import { getSocialConfig, saveSocialConfig } from '@/lib/social/settings';
import { isTokenEncryptionConfigured } from '@/lib/social/crypto';
import { isBlobStorageConfigured } from '@/lib/social/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSocialApi(request, 'settings');
  if (!auth.ok) return auth.response;

  const config = await getSocialConfig();
  const memberCount = await prisma.socialMember.count();
  return NextResponse.json(
    {
      ok: true,
      data: {
        config,
        memberCount,
        flags: {
          cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
          tokenEncryptionReady: isTokenEncryptionConfigured(),
          blobConfigured: isBlobStorageConfigured(),
        },
        scheduler: {
          endpoint: '/api/cron/social',
          dailyCron: '30 2 * * * (UTC)',
          note: 'For sub-daily publishing, point any free scheduler at the endpoint with the CRON_SECRET bearer token, or use “Run due now”.',
        },
      },
    },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}

export async function PUT(request: NextRequest) {
  const auth = await requireSocialApi(request, 'settings');
  if (!auth.ok) return auth.response;

  const json = await request.json().catch(() => null);
  const parsed = settingsInputSchema.safeParse(json);
  if (!parsed.success) return socialError(firstZodError(parsed.error), 400);

  const config = await saveSocialConfig(parsed.data);
  await writeAuditLog({
    adminId: auth.actor.id,
    adminEmail: auth.actor.email,
    action: 'social.settings.update',
    targetType: 'AdminSetting',
    targetId: 'social_config',
    detail: { timezone: config.timezone, defaultPlatforms: config.defaultPlatforms },
  });

  return NextResponse.json({ ok: true, data: { config } }, { headers: SOCIAL_NO_STORE_HEADERS });
}
