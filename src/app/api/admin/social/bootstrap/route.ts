import { NextRequest, NextResponse } from 'next/server';
import { capabilitiesFor } from '@/lib/social/permissions';
import { requireSocialApi, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { PLATFORMS } from '@/lib/social/platforms';
import { getSocialConfig } from '@/lib/social/settings';
import { isTokenEncryptionConfigured } from '@/lib/social/crypto';
import { isBlobStorageConfigured, MAX_UPLOAD_BYTES } from '@/lib/social/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSocialApi(request, 'view');
  if (!auth.ok) return auth.response;

  const config = await getSocialConfig();
  const blobConfigured = isBlobStorageConfigured();
  const mediaMode = blobConfigured ? 'blob' : process.env.VERCEL ? 'unavailable' : 'local';

  return NextResponse.json(
    {
      ok: true,
      data: {
        actor: {
          id: auth.actor.id,
          email: auth.actor.email,
          name: auth.actor.name,
          role: auth.actor.role,
          capabilities: capabilitiesFor(auth.actor.role),
        },
        config,
        platforms: PLATFORMS,
        media: { mode: mediaMode, maxBytes: MAX_UPLOAD_BYTES },
        flags: {
          tokenEncryptionReady: isTokenEncryptionConfigured(),
          blobConfigured,
          cronConfigured: Boolean(process.env.CRON_SECRET?.trim()),
          onVercel: Boolean(process.env.VERCEL),
        },
        serverTime: new Date().toISOString(),
      },
    },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}
