import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PRICING_KEY = 'pricing_config';

const pricingSchema = z.object({
  plans: z.array(z.object({
    id:       z.string(),
    name:     z.string(),
    price:    z.number(),
    yearlyPrice: z.number().optional(),
    credits:  z.number(),
    features: z.array(z.string()),
    popular:  z.boolean().optional(),
  })),
  creditPacks: z.array(z.object({
    id:      z.string(),
    credits: z.number(),
    price:   z.number(),
    bonus:   z.number().optional(),
  })),
});

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

const DEFAULT_PRICING = {
  plans: [
    { id: 'free',     name: 'Free',     price: 0,   credits: 10,   features: ['10 credits/day', 'All free tools', 'No signup required'],                                 popular: false },
    { id: 'pro',      name: 'Pro',      price: 9,   yearlyPrice: 7,  credits: 500,  features: ['500 credits/month', 'All tools', 'No watermarks', 'Priority support'],    popular: true  },
    { id: 'max',      name: 'Max',      price: 19,  yearlyPrice: 15, credits: 2000, features: ['2000 credits/month', 'All tools', 'Bulk downloads', 'API access'],        popular: false },
    { id: 'lifetime', name: 'Lifetime', price: 149, credits: 99999, features: ['Unlimited credits', 'All tools forever', 'Lifetime updates', 'Priority support'],       popular: false },
  ],
  creditPacks: [
    { id: 'pack_100',  credits: 100,  price: 2,  bonus: 0  },
    { id: 'pack_500',  credits: 500,  price: 8,  bonus: 50 },
    { id: 'pack_1500', credits: 1500, price: 20, bonus: 250 },
  ],
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const setting = await prisma.adminSetting.findUnique({ where: { key: PRICING_KEY } });
  const config = setting ? JSON.parse(setting.value) : DEFAULT_PRICING;
  return NextResponse.json({ ok: true, data: config });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = pricingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid pricing data', details: parsed.error.flatten() }, { status: 400 });

  await prisma.adminSetting.upsert({
    where:  { key: PRICING_KEY },
    update: { value: JSON.stringify(parsed.data) },
    create: { key: PRICING_KEY, value: JSON.stringify(parsed.data) },
  });

  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'pricing.update', targetType: 'AdminSetting', targetId: PRICING_KEY });

  return NextResponse.json({ ok: true, data: parsed.data });
}
