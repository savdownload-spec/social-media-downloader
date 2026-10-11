import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PRIVATE_NO_STORE_HEADERS, requireAdminApi } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const sp       = req.nextUrl.searchParams;
  const page     = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const pageSize = Math.min(50, parseInt(sp.get('pageSize') ?? '25', 10));
  const status   = sp.get('status') ?? '';
  const search   = sp.get('search')?.trim() ?? '';

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
