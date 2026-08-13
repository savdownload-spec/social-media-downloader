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
      total, page, totalPages: Math.ceil(total / pageSize),
    },
  });
}
