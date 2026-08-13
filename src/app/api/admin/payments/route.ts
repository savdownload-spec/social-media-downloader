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
  const search   = sp.get('search')?.trim() ?? '';

  // Use credit transactions with kind=purchase as payment records (real Stripe data flows through here)
  const where: Record<string, unknown> = { kind: 'purchase' };
  if (search) where.OR = [
    { user: { email: { contains: search, mode: 'insensitive' } } },
    { externalId: { contains: search, mode: 'insensitive' } },
  ];

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.creditTransaction.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      payments: transactions.map((t) => ({
        id: t.id,
        externalId: t.externalId,
        user: t.user,
        amount: t.amount,
        description: t.description,
        status: 'succeeded',
        createdAt: t.createdAt.toISOString(),
      })),
      total, page, totalPages: Math.ceil(total / pageSize),
    },
  });
}
