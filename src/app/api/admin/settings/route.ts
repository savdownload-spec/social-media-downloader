import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { z } from 'zod';
import { requireAdminApi, PRIVATE_NO_STORE_HEADERS } from '@/lib/admin-auth';
import { MAINTENANCE_SETTING_KEY } from '@/lib/maintenance';
import { DEFAULT_REFERRAL_CREDIT_USD_RATE, REFERRAL_CREDIT_VALUE_SETTING } from '@/lib/affiliates-constants';
import {
  BUSINESS_SETTING_KEYS,
  DEFAULT_COMPLIANCE_SETTINGS,
  POLICY_SETTING_KEYS,
} from '@/config/compliance';
import { revalidateComplianceSettings } from '@/lib/compliance-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

const DEFAULT_SETTINGS: Record<string, string> = {
  site_name:                  'SavDown',
  site_tagline:               'The Free Video Downloader',
  free_daily_credits:         '10',
  pro_monthly_credits:        '500',
  max_monthly_credits:        '2000',
  reviews_require_approval:   'true',
  reviews_enabled:            'true',
  affiliate_enabled:          'false',
  affiliate_commission_rate:  '20',
  [REFERRAL_CREDIT_VALUE_SETTING]: String(DEFAULT_REFERRAL_CREDIT_USD_RATE),
  newsletter_enabled:         'true',
  maintenance_mode:           'false',
  ...DEFAULT_COMPLIANCE_SETTINGS,
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const stored = await prisma.adminSetting.findMany();
  const result = { ...DEFAULT_SETTINGS };
  for (const s of stored) {
    if (Object.hasOwn(DEFAULT_SETTINGS, s.key)) result[s.key] = s.value;
  }
  return NextResponse.json({ ok: true, data: result }, { headers: PRIVATE_NO_STORE_HEADERS });
}

const maintenanceSchema = z.object({ enabled: z.boolean() }).strict();

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = maintenanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Maintenance mode must be true or false.' },
      { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
    );
  }

  const value = parsed.data.enabled ? 'true' : 'false';
  await prisma.adminSetting.upsert({
    where: { key: MAINTENANCE_SETTING_KEY },
    update: { value },
    create: { key: MAINTENANCE_SETTING_KEY, value },
  });

  await writeAuditLog({
    adminId: auth.user.id,
    adminEmail: auth.user.email ?? 'admin',
    action: 'settings.maintenance.update',
    detail: { enabled: parsed.data.enabled },
  });

  return NextResponse.json(
    { ok: true, data: { maintenance_mode: value } },
    { headers: PRIVATE_NO_STORE_HEADERS },
  );
}

const updateSchema = z.record(z.string(), z.string());

function isInternationalContactNumber(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value.replace(/[\s().-]/g, ''));
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 400 });

  const creditRate = parsed.data[REFERRAL_CREDIT_VALUE_SETTING];
  if (creditRate !== undefined && (!Number.isFinite(Number(creditRate)) || Number(creditRate) <= 0 || Number(creditRate) > 1)) {
    return NextResponse.json({ ok: false, error: 'Estimated USD value per SavCredit must be greater than 0 and no more than 1.' }, { status: 400 });
  }

  const businessName = parsed.data[BUSINESS_SETTING_KEYS.name];
  if (businessName !== undefined && (!businessName.trim() || businessName.length > 120)) {
    return NextResponse.json({ ok: false, error: 'Business name is required and must be 120 characters or fewer.' }, { status: 400 });
  }
  const businessAddress = parsed.data[BUSINESS_SETTING_KEYS.address];
  if (businessAddress !== undefined && (!businessAddress.trim() || businessAddress.length > 300)) {
    return NextResponse.json({ ok: false, error: 'Office address is required and must be 300 characters or fewer.' }, { status: 400 });
  }
  for (const key of [BUSINESS_SETTING_KEYS.phone, BUSINESS_SETTING_KEYS.whatsapp]) {
    const value = parsed.data[key];
    if (value !== undefined && !isInternationalContactNumber(value)) {
      return NextResponse.json({ ok: false, error: 'Phone and WhatsApp numbers must use international format, for example +92 304 8804973.' }, { status: 400 });
    }
  }
  for (const key of Object.values(POLICY_SETTING_KEYS)) {
    const value = parsed.data[key];
    if (value !== undefined && (!value.trim() || value.length > 50_000)) {
      return NextResponse.json({ ok: false, error: 'Policy content is required and must be 50,000 characters or fewer.' }, { status: 400 });
    }
  }

  // Only this form's settings belong to this write. Other AdminSetting rows
  // (AI configuration, provider settings, pricing) have their own editors.
  const settings = Object.fromEntries(Object.entries(parsed.data).filter(
    ([key]) => Object.hasOwn(DEFAULT_SETTINGS, key) && key !== MAINTENANCE_SETTING_KEY,
  ));
  await prisma.$transaction(Object.entries(settings).map(([key, value]) =>
    prisma.adminSetting.upsert({ where: { key }, update: { value }, create: { key, value } }),
  ));

  if (Object.keys(settings).some((key) => Object.hasOwn(DEFAULT_COMPLIANCE_SETTINGS, key))) {
    revalidateComplianceSettings();
  }

  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'settings.update', detail: settings });

  return NextResponse.json({ ok: true, data: settings }, { headers: PRIVATE_NO_STORE_HEADERS });
}
