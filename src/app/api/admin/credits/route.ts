import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safePage, safePageSize } from '@/lib/admin-analytics';
import { PRIVATE_NO_STORE_HEADERS, requireAdminApi } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KINDS = new Set(['purchase', 'plan_refill', 'plan_grant', 'spend', 'refund', 'adjustment', 'expiration']);

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const page = safePage(sp.get('page'));
  const pageSize = safePageSize(sp.get('pageSize'), 25, 50);
  const kind = sp.get('kind')?.trim() ?? '';
  const search = sp.get('search')?.trim().slice(0, 100) ?? '';
  if (kind && !KINDS.has(kind)) return NextResponse.json({ ok: false, error: 'Unknown transaction type.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });

  const where: Prisma.CreditTransactionWhereInput = {};
  if (kind) where.kind = kind;
  if (search) where.OR = [
    { user: { email: { contains: search, mode: 'insensitive' } } },
    { user: { name: { contains: search, mode: 'insensitive' } } },
    { description: { contains: search, mode: 'insensitive' } },
    { operation: { tool: { contains: search, mode: 'insensitive' } } },
  ];

  const [transactions, total, ledgerRows, balances] = await Promise.all([
    prisma.creditTransaction.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, name: true, email: true } },
        operation: { select: { id: true, tool: true, platform: true, status: true } },
        payment: { select: { id: true, provider: true, providerPaymentId: true } },
      },
    }),
    prisma.creditTransaction.count({ where }),
    prisma.$queryRaw<Array<{ totalIssued: bigint; totalSpent: bigint; totalRefunded: bigint; purchaseRevoked: bigint; adjustments: bigint; expired: bigint; ledgerNet: bigint; transactionCount: bigint }>>(Prisma.sql`
      SELECT
        COALESCE(SUM(CASE WHEN "kind" IN ('purchase', 'plan_refill', 'plan_grant') AND "amount" > 0 THEN "amount" ELSE 0 END), 0)::bigint AS "totalIssued",
        COALESCE(SUM(CASE WHEN "kind" = 'spend' AND "amount" < 0 THEN -"amount" ELSE 0 END), 0)::bigint AS "totalSpent",
        COALESCE(SUM(CASE WHEN "kind" = 'refund' AND "amount" > 0 THEN "amount" ELSE 0 END), 0)::bigint AS "totalRefunded",
        COALESCE(SUM(CASE WHEN "kind" = 'refund' AND "amount" < 0 THEN -"amount" ELSE 0 END), 0)::bigint AS "purchaseRevoked",
        COALESCE(SUM(CASE WHEN "kind" = 'adjustment' THEN "amount" ELSE 0 END), 0)::bigint AS "adjustments",
        COALESCE(SUM(CASE WHEN "kind" = 'expiration' AND "amount" < 0 THEN -"amount" ELSE 0 END), 0)::bigint AS "expired",
        COALESCE(SUM("amount"), 0)::bigint AS "ledgerNet",
        COUNT(*)::bigint AS "transactionCount"
      FROM "CreditTransaction"
    `),
    prisma.user.aggregate({ _sum: { planCredits: true, purchasedCredits: true } }),
  ]);

  const ledger = ledgerRows[0] ?? { totalIssued: 0n, totalSpent: 0n, totalRefunded: 0n, purchaseRevoked: 0n, adjustments: 0n, expired: 0n, ledgerNet: 0n, transactionCount: 0n };
  const totalIssued = Number(ledger.totalIssued);
  const totalSpent = Number(ledger.totalSpent);
  const totalRefunded = Number(ledger.totalRefunded);
  const purchaseRevoked = Number(ledger.purchaseRevoked);
  const adjustments = Number(ledger.adjustments);
  const expired = Number(ledger.expired);
  const ledgerNet = Number(ledger.ledgerNet);
  const transactionCount = Number(ledger.transactionCount);
  const currentBalance = (balances._sum.planCredits ?? 0) + (balances._sum.purchasedCredits ?? 0);

  return NextResponse.json({
    ok: true,
    data: {
      transactions: transactions.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      summary: {
        totalIssued,
        totalSpent,
        totalRefunded,
        purchaseRevoked,
        adjustments,
        expired,
        ledgerNet,
        currentBalance,
        transactionCount,
        historicalReconciliationDelta: currentBalance - ledgerNet,
      },
      definitions: {
        totalIssued: 'Positive purchases, plan grants, and plan refills',
        totalSpent: 'Absolute sum of spend transactions',
        totalRefunded: 'Credits restored after uncompleted or failed operations',
        purchaseRevoked: 'Revoked purchases or negative refund corrections',
        adjustments: 'Net manual balance adjustments by administrators',
        expired: 'Unused plan credits expired at allowance period resets',
        ledgerNet: 'Net movement of all recorded credit transactions (issued - spent + refunds + adjustments - expired)',
        currentBalance: 'Sum of current plan and purchased balances for all users',
        historicalReconciliationDelta: 'Difference between current user balances and ledger net movement (pre-audit unlogged allowances baseline)',
      },
    },
  }, { headers: PRIVATE_NO_STORE_HEADERS });
}
