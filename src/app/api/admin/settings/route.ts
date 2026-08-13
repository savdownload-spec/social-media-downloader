import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { z } from 'zod';

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
  newsletter_enabled:         'true',
  maintenance_mode:           'false',
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const stored = await prisma.adminSetting.findMany();
  const result = { ...DEFAULT_SETTINGS };
  for (const s of stored) {
    if (s.key !== 'pricing_config') result[s.key] = s.value;
  }
  return NextResponse.json({ ok: true, data: result });
}

const updateSchema = z.record(z.string(), z.string());

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 400 });

  // Upsert each setting
  await Promise.all(
    Object.entries(parsed.data).map(([key, value]) =>
      key !== 'pricing_config'
        ? prisma.adminSetting.upsert({ where: { key }, update: { value }, create: { key, value } })
        : Promise.resolve()
    )
  );

  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'settings.update', detail: parsed.data as Record<string, unknown> });

  return NextResponse.json({ ok: true, data: parsed.data });
}
