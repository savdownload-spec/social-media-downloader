import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { DEFAULT_PRICING } from '@/config/pricing';
import {
  PRICING_SETTING_KEY,
  pricingConfigSchema,
  revalidatePricing,
} from '@/lib/pricing-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

/**
 * The admin pricing API. GET returns the current model (falling back to the
 * default when the stored value is missing or from an older shape); PUT
 * validates against the shared schema, stores it, and revalidates the pricing
 * cache so every public surface picks up the change on the next load.
 *
 * This reads/writes the SAME `pricing_config` row and shares the SAME schema
 * and default as `@/lib/pricing-server`, so admin and public can never diverge.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const setting = await prisma.adminSetting.findUnique({ where: { key: PRICING_SETTING_KEY } });
  let config = DEFAULT_PRICING;
  if (setting) {
    try {
      const parsed = pricingConfigSchema.safeParse(JSON.parse(setting.value));
      if (parsed.success) config = parsed.data;
    } catch {
      // Malformed or older stored shape → serve the default so the admin can
      // save a clean copy over it.
    }
  }
  return NextResponse.json({ ok: true, data: config });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = pricingConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid pricing data', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  await prisma.adminSetting.upsert({
    where: { key: PRICING_SETTING_KEY },
    update: { value: JSON.stringify(parsed.data) },
    create: { key: PRICING_SETTING_KEY, value: JSON.stringify(parsed.data) },
  });

  await writeAuditLog({
    adminId: admin.id!,
    adminEmail: admin.email!,
    action: 'pricing.update',
    targetType: 'AdminSetting',
    targetId: PRICING_SETTING_KEY,
  });

  // Bust the cached pricing so the public site reflects the change.
  revalidatePricing();

  return NextResponse.json({ ok: true, data: parsed.data });
}
