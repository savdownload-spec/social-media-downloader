import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PRIVATE_NO_STORE_HEADERS, requireAdminApi } from '@/lib/admin-auth';
import { safePage, safePageSize } from '@/lib/admin-analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const page = safePage(sp.get('page'));
  const pageSize = safePageSize(sp.get('pageSize'), 25, 50);
  const search = sp.get('search')?.trim().slice(0, 100) ?? '';
  const paymentId = sp.get('paymentId')?.trim() ?? '';
  const paymentWhere: Prisma.PaymentWhereInput = paymentId ? { id: paymentId } : search ? { OR: [
    { user: { email: { contains: search, mode: 'insensitive' } } },
    { providerPaymentId: { contains: search, mode: 'insensitive' } },
    { reference: { contains: search, mode: 'insensitive' } },
  ] } : {};

  const legacyWhere: Prisma.CreditTransactionWhereInput = {
    kind: 'purchase',
    paymentId: null,
    ...(paymentId ? { id: '__notification_payment_only__' } : {}),
    ...(search ? { OR: [
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { externalId: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ] } : {}),
  };
  const candidateTake = page * pageSize;
  const [payments, paymentTotal, legacy, legacyTotal] = await Promise.all([
    prisma.payment.findMany({ where: paymentWhere, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: candidateTake, include: { user: { select: { id: true, name: true, email: true } } } }),
    prisma.payment.count({ where: paymentWhere }),
    prisma.creditTransaction.findMany({
      where: legacyWhere,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: candidateTake,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.creditTransaction.count({ where: legacyWhere }),
  ]);

  // Provider payment amounts are minor currency units. Legacy Stripe rows only
  // contain the credits granted, so keep the units explicit instead of
  // presenting currency as credits or hiding one source when the other exists.
  const rows = [
    ...payments.map((p) => ({ id: p.id, provider: p.provider, externalId: p.providerPaymentId, reference: p.reference, user: p.user, amount: p.amount, amountType: 'currency', currency: p.currency, description: p.itemId, status: p.status, createdAt: p.createdAt.toISOString(), paidAt: p.paidAt?.toISOString() ?? null, refundedAt: p.refundedAt?.toISOString() ?? null })),
    ...legacy.map((t) => ({ id: t.id, provider: 'STRIPE', externalId: t.externalId, reference: null, user: t.user, amount: t.amount, amountType: 'credits', currency: null, description: t.description, status: 'succeeded', createdAt: t.createdAt.toISOString(), paidAt: t.createdAt.toISOString(), refundedAt: null })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
    .slice((page - 1) * pageSize, page * pageSize);
  const total = paymentTotal + legacyTotal;
  return NextResponse.json({ ok: true, data: { payments: rows, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) } }, { headers: PRIVATE_NO_STORE_HEADERS });
}
