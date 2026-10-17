import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PRIVATE_NO_STORE_HEADERS, requireAdminApi } from '@/lib/admin-auth';
import { safePage, safePageSize } from '@/lib/admin-analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete']);

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const sp       = req.nextUrl.searchParams;
  const page     = safePage(sp.get('page'));
  const pageSize = safePageSize(sp.get('pageSize'), 25, 50);
  const status   = sp.get('status')?.trim() ?? '';
  const search   = sp.get('search')?.trim().slice(0, 100) ?? '';
  if (status && !SUBSCRIPTION_STATUSES.has(status)) {
    return NextResponse.json({ ok: false, error: 'Unknown subscription status.' }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
  }

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) where.user = { OR: [
    { email: { contains: search, mode: 'insensitive' } },
    { name:  { contains: search, mode: 'insensitive' } },
  ]};

  const [subs, total] = await Promise.all([
    prisma.subscription.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.subscription.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      subscriptions: subs.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
      })),
      total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }, { headers: PRIVATE_NO_STORE_HEADERS });
}
