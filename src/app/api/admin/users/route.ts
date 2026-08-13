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
  const page     = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const pageSize = Math.min(50, parseInt(sp.get('pageSize') ?? '25', 10));
  const search   = sp.get('search')?.trim() ?? '';
  const plan     = sp.get('plan') ?? '';
  const status   = sp.get('status') ?? '';

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name:  { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (plan) where.plan = plan;
  if (status === 'SUSPENDED') where.role = 'SUSPENDED';

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, email: true, image: true, role: true,
        plan: true, planCredits: true, purchasedCredits: true,
        createdAt: true, updatedAt: true,
        _count: { select: { downloads: true, subscriptions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      users: users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        totalCredits: u.planCredits + u.purchasedCredits,
      })),
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
