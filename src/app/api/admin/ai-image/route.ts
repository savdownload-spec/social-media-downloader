import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { DEFAULT_AI_IMAGE_CONFIG } from '@/config/aiImage';
import {
  AI_IMAGE_SETTING_KEY,
  aiImageConfigSchema,
  revalidateAiImageConfig,
} from '@/lib/ai-image-config-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

/**
 * The admin AI Image Generator config API. GET returns the current model
 * (falling back to the default when the stored value is missing or from an
 * older shape); PUT validates against the shared schema, stores it, and
 * revalidates the cache so `/api/tools/ai-image-generator` picks up the
 * change on its next request.
 *
 * Provider credentials are never read or written here — only the tunable
 * knobs (models, cost, limits) that don't need secrecy.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const setting = await prisma.adminSetting.findUnique({ where: { key: AI_IMAGE_SETTING_KEY } });
  let config = DEFAULT_AI_IMAGE_CONFIG;
  if (setting) {
    try {
      const parsed = aiImageConfigSchema.safeParse(JSON.parse(setting.value));
      if (parsed.success) config = parsed.data;
    } catch {
      // Malformed or older stored shape → serve the default so the admin can save a clean copy over it.
    }
  }
  return NextResponse.json({ ok: true, data: config });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = aiImageConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid AI Image Generator settings', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await prisma.adminSetting.upsert({
    where: { key: AI_IMAGE_SETTING_KEY },
    update: { value: JSON.stringify(parsed.data) },
    create: { key: AI_IMAGE_SETTING_KEY, value: JSON.stringify(parsed.data) },
  });

  await writeAuditLog({
    adminId: admin.id!,
    adminEmail: admin.email!,
    action: 'ai_image_config.update',
    targetType: 'AdminSetting',
    targetId: AI_IMAGE_SETTING_KEY,
  });

  revalidateAiImageConfig();

  return NextResponse.json({ ok: true, data: parsed.data });
}
