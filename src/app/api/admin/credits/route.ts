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
  const kind     = sp.get('kind') ?? '';
  const search   = sp.get('search')?.trim() ?? '';

  const where: Record<string, unknown> = {};
  if (kind)   where.kind = kind;
  if (search) where.OR = [
    { user: { email: { contains: search, mode: 'insensitive' } } },
    { user: { name:  { contains: search, mode: 'insensitive' } } },
    { description: { contains: search, mode: 'insensitive' } },
  ];

  const [transactions, total, summary] = await Promise.all([
    prisma.creditTransaction.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.creditTransaction.count({ where }),
    prisma.creditTransaction.aggregate({
      _sum: { amount: true },
      where: { amount: { gt: 0 } },
    }),
  ]);

  const totalSpent = await prisma.creditTransaction.aggregate({
    _sum: { amount: true }, where: { kind: 'spend' },
  });

  return NextResponse.json({
    ok: true,
    data: {
      transactions: transactions.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
      })),
      total, page, totalPages: Math.ceil(total / pageSize),
      summary: {
        totalIssued: summary._sum.amount ?? 0,
        totalSpent: Math.abs(totalSpent._sum.amount ?? 0),
      },
    },
  });
}
