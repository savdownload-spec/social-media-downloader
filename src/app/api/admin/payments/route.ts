import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const pageSize = Math.min(50, parseInt(sp.get('pageSize') ?? '25', 10));
  const search = sp.get('search')?.trim() ?? '';
  const paymentWhere: Record<string, unknown> = search ? { OR: [
    { user: { email: { contains: search, mode: 'insensitive' } } },
    { providerPaymentId: { contains: search, mode: 'insensitive' } },
    { reference: { contains: search, mode: 'insensitive' } },
  ] } : {};

  const [payments, paymentTotal] = await Promise.all([
    prisma.payment.findMany({ where: paymentWhere, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.payment.count({ where: paymentWhere }),
  ]);

  // Legacy Stripe grants remain visible until the existing Stripe data is migrated.
  const legacy = payments.length === 0 ? await prisma.creditTransaction.findMany({
    where: { kind: 'purchase', ...(search ? { OR: [{ user: { email: { contains: search, mode: 'insensitive' } } }, { externalId: { contains: search, mode: 'insensitive' } }] } : {}) },
    orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
    include: { user: { select: { id: true, name: true, email: true } } },
  }) : [];

  const rows = payments.length > 0 ? payments.map((p) => ({ id: p.id, provider: p.provider, externalId: p.providerPaymentId, reference: p.reference, user: p.user, amount: p.amount, currency: p.currency, description: p.itemId, status: p.status, createdAt: p.createdAt.toISOString(), paidAt: p.paidAt?.toISOString() ?? null, refundedAt: p.refundedAt?.toISOString() ?? null })) : legacy.map((t) => ({ id: t.id, provider: 'STRIPE', externalId: t.externalId, reference: null, user: t.user, amount: t.amount, currency: null, description: t.description, status: 'succeeded', createdAt: t.createdAt.toISOString(), paidAt: t.createdAt.toISOString(), refundedAt: null }));
  const total = payments.length > 0 ? paymentTotal : legacy.length;
  return NextResponse.json({ ok: true, data: { payments: rows, total, page, totalPages: Math.ceil(total / pageSize) } });
}
