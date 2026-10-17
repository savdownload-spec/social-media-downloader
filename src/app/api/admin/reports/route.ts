import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PRIVATE_NO_STORE_HEADERS, requireAdminApi } from '@/lib/admin-auth';
import { reconcileStaleOperations } from '@/lib/credits';
import {
  buildOperationWhere,
  dateWhere,
  resolveAdminDateRange,
  safePage,
  safePageSize,
  serializeCsv,
} from '@/lib/admin-analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REPORT_TYPES = new Set(['usage', 'users', 'subscriptions', 'credits']);
const MAX_EXPORT_ROWS = 50_000;

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const type = sp.get('type') ?? 'usage';
  if (!REPORT_TYPES.has(type)) return NextResponse.json({ ok: false, error: 'Unknown report type.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
  if (type === 'usage') await reconcileStaleOperations();

  const range = resolveAdminDateRange(sp.get('days'));
  const format = sp.get('format') === 'csv' ? 'csv' : 'json';
  const page = safePage(sp.get('page'));
  const pageSize = safePageSize(sp.get('pageSize'), 50, 100);
  const search = sp.get('search')?.trim().slice(0, 100) ?? '';
  const skip = format === 'csv' ? 0 : (page - 1) * pageSize;
  const take = format === 'csv' ? MAX_EXPORT_ROWS : pageSize;

  let headers: string[] = [];
  let rows: Record<string, unknown>[] = [];
  let total = 0;
  let summary: Record<string, number> | undefined;

  if (type === 'usage') {
    const where = buildOperationWhere({
      range,
      search,
      tool: sp.get('tool')?.trim().slice(0, 100),
      platform: sp.get('platform')?.trim().slice(0, 100),
      status: sp.get('status')?.trim().slice(0, 30),
    });
    total = await prisma.download.count({ where });
    if (format === 'csv' && total > MAX_EXPORT_ROWS) return exportTooLarge(total);
    const data = await prisma.download.findMany({
      where, skip, take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        tool: true,
        platform: true,
        status: true,
        failureCode: true,
        failureReason: true,
        creditCost: true,
        batchId: true,
        createdAt: true,
        completedAt: true,
      },
    });
    headers = ['id', 'tool', 'platform', 'status', 'failureCode', 'failureReason', 'creditCost', 'batchId', 'createdAt', 'completedAt'];
    rows = data.map((row) => ({
      ...row,
      failureCode: row.failureCode ?? '',
      failureReason: row.failureReason ?? '',
      batchId: row.batchId ?? '',
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? '',
    }));
  } else if (type === 'users') {
    const where: Prisma.UserWhereInput = { createdAt: dateWhere(range) };
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }];
    total = await prisma.user.count({ where });
    if (format === 'csv' && total > MAX_EXPORT_ROWS) return exportTooLarge(total);
    const data = await prisma.user.findMany({
      where, skip, take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, name: true, email: true, role: true, plan: true, createdAt: true },
    });
    headers = ['id', 'name', 'email', 'role', 'plan', 'createdAt'];
    rows = data.map((row) => ({ ...row, name: row.name ?? '', email: row.email ?? '', createdAt: row.createdAt.toISOString() }));
  } else if (type === 'subscriptions') {
    const where: Prisma.SubscriptionWhereInput = { createdAt: dateWhere(range) };
    const status = sp.get('status')?.trim().slice(0, 30);
    if (status && status !== 'lifetime') where.status = status;
    if (status === 'lifetime') where.id = '__no_subscription_rows__';
    if (search) where.OR = [
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { plan: { contains: search, mode: 'insensitive' } },
      { provider: { contains: search, mode: 'insensitive' } },
    ];
    const lifetimeWhere: Prisma.CreditTransactionWhereInput = {
      createdAt: dateWhere(range),
      kind: 'plan_grant',
      bucket: 'purchased',
      ...(status && status !== 'lifetime' ? { id: '__no_lifetime_rows__' } : {}),
      ...(search ? { user: { email: { contains: search, mode: 'insensitive' } } } : {}),
    };
    const [subscriptionCount, lifetimeCount] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.creditTransaction.count({ where: lifetimeWhere }),
    ]);
    total = subscriptionCount + lifetimeCount;
    if (format === 'csv' && total > MAX_EXPORT_ROWS) return exportTooLarge(total);
    const candidateTake = format === 'csv' ? take : skip + take;
    const [data, lifetime] = await Promise.all([
      prisma.subscription.findMany({
        where, take: candidateTake, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { user: { select: { email: true } } },
      }),
      prisma.creditTransaction.findMany({
        where: lifetimeWhere, take: candidateTake, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { user: { select: { email: true } } },
      }),
    ]);
    headers = ['id', 'userEmail', 'provider', 'plan', 'status', 'interval', 'cancelAtPeriodEnd', 'currentPeriodEnd', 'createdAt', 'updatedAt'];
    const subscriptionRows = data.map((row) => ({
      id: row.id,
      userEmail: row.user.email ?? '',
      provider: row.provider,
      plan: row.plan,
      status: row.status,
      interval: row.interval,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
    const lifetimeRows = lifetime.map((row) => ({
      id: row.id,
      userEmail: row.user?.email ?? '',
      provider: row.externalId?.startsWith('cs_') ? 'STRIPE' : 'ADMIN/SAFEPAY',
      plan: 'LIFETIME',
      status: 'lifetime',
      interval: 'one-time',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: '',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.createdAt.toISOString(),
    }));
    rows = [...subscriptionRows, ...lifetimeRows]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || String(b.id).localeCompare(String(a.id)))
      .slice(format === 'csv' ? 0 : skip, format === 'csv' ? undefined : skip + take);
  } else {
    const where: Prisma.CreditTransactionWhereInput = { createdAt: dateWhere(range) };
    const kind = sp.get('kind')?.trim().slice(0, 30);
    if (kind) where.kind = kind;
    if (search) where.OR = [
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { description: { contains: search, mode: 'insensitive' } },
      { operation: { tool: { contains: search, mode: 'insensitive' } } },
    ];
    const sqlFilters: Prisma.Sql[] = [
      Prisma.sql`ct."createdAt" >= ${range.start}`,
      Prisma.sql`ct."createdAt" < ${range.end}`,
    ];
    if (kind) sqlFilters.push(Prisma.sql`ct."kind" = ${kind}`);
    if (search) {
      const contains = `%${search}%`;
      sqlFilters.push(Prisma.sql`(u."email" ILIKE ${contains} OR ct."description" ILIKE ${contains} OR d."tool" ILIKE ${contains})`);
    }
    const [count, aggregateRows] = await Promise.all([
      prisma.creditTransaction.count({ where }),
      prisma.$queryRaw<Array<{ totalIssued: bigint; totalSpent: bigint; totalRefunded: bigint; purchaseRevoked: bigint; adjustments: bigint; expired: bigint; netMovement: bigint }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN ct."kind" IN ('purchase', 'plan_refill', 'plan_grant') AND ct."amount" > 0 THEN ct."amount" ELSE 0 END), 0)::bigint AS "totalIssued",
          COALESCE(SUM(CASE WHEN ct."kind" = 'spend' AND ct."amount" < 0 THEN -ct."amount" ELSE 0 END), 0)::bigint AS "totalSpent",
          COALESCE(SUM(CASE WHEN ct."kind" = 'refund' AND ct."amount" > 0 THEN ct."amount" ELSE 0 END), 0)::bigint AS "totalRefunded",
          COALESCE(SUM(CASE WHEN ct."kind" = 'refund' AND ct."amount" < 0 THEN -ct."amount" ELSE 0 END), 0)::bigint AS "purchaseRevoked",
          COALESCE(SUM(CASE WHEN ct."kind" = 'adjustment' THEN ct."amount" ELSE 0 END), 0)::bigint AS "adjustments",
          COALESCE(SUM(CASE WHEN ct."kind" = 'expiration' AND ct."amount" < 0 THEN -ct."amount" ELSE 0 END), 0)::bigint AS "expired",
          COALESCE(SUM(ct."amount"), 0)::bigint AS "netMovement"
        FROM "CreditTransaction" ct
        LEFT JOIN "User" u ON u."id" = ct."userId"
        LEFT JOIN "Download" d ON d."id" = ct."operationId"
        WHERE ${Prisma.join(sqlFilters, ' AND ')}
      `),
    ]);
    total = count;
    if (format === 'csv' && total > MAX_EXPORT_ROWS) return exportTooLarge(total);
    const aggregate = aggregateRows[0];
    summary = aggregate ? {
      totalIssued: Number(aggregate.totalIssued), totalSpent: Number(aggregate.totalSpent), totalRefunded: Number(aggregate.totalRefunded),
      purchaseRevoked: Number(aggregate.purchaseRevoked), adjustments: Number(aggregate.adjustments), expired: Number(aggregate.expired),
      netMovement: Number(aggregate.netMovement), transactions: count,
    } : { totalIssued: 0, totalSpent: 0, totalRefunded: 0, purchaseRevoked: 0, adjustments: 0, expired: 0, netMovement: 0, transactions: count };
    const data = await prisma.creditTransaction.findMany({
      where, skip, take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        user: { select: { email: true } },
        operation: { select: { id: true, tool: true, status: true } },
        payment: { select: { id: true, provider: true, providerPaymentId: true } },
      },
    });
    headers = ['id', 'userEmail', 'kind', 'bucket', 'amount', 'tool', 'operationId', 'operationStatus', 'paymentId', 'description', 'balanceAfter', 'createdAt'];
    rows = data.map((row) => ({
      id: row.id,
      userEmail: row.user?.email ?? '',
      kind: row.kind,
      bucket: row.bucket,
      amount: row.amount,
      tool: row.operation?.tool ?? '',
      operationId: row.operationId ?? '',
      operationStatus: row.operation?.status ?? '',
      paymentId: row.payment?.providerPaymentId ?? row.paymentId ?? '',
      description: row.description ?? '',
      balanceAfter: row.balanceAfter ?? '',
      createdAt: row.createdAt.toISOString(),
    }));
  }

  if (format === 'csv') return csvResponse(type, headers, rows, total);
  return NextResponse.json({
    ok: true,
    data: {
      rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      summary,
      range: { ...range, start: range.start.toISOString(), end: range.end.toISOString() },
    },
  }, { headers: PRIVATE_NO_STORE_HEADERS });
}

function exportTooLarge(total: number) {
  return NextResponse.json(
    { ok: false, error: `Export has ${total} rows; narrow the filters below ${MAX_EXPORT_ROWS}.` },
    { status: 413, headers: PRIVATE_NO_STORE_HEADERS },
  );
}

function csvResponse(type: string, headers: string[], rows: Record<string, unknown>[], total: number) {
  const csv = serializeCsv(headers, rows);
  return new NextResponse(csv, {
    headers: {
      ...PRIVATE_NO_STORE_HEADERS,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}-report-${new Date().toISOString().slice(0, 10)}.csv"`,
      'X-Report-Row-Count': String(total),
    },
  });
}
