import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TIER_ALLOWANCE } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

const TRANSIENT_DATABASE_CODES = new Set(['P1001', 'P1002', 'P1017', 'P2024']);

function databaseErrorCode(error: unknown): string | undefined {
  if (error instanceof Prisma.PrismaClientKnownRequestError) return error.code;
  if (error instanceof Prisma.PrismaClientInitializationError) return error.errorCode;
  return undefined;
}

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

  const requestId = crypto.randomUUID();
  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, name: true, email: true, image: true, role: true,
          plan: true, planCredits: true, planCreditsResetAt: true, purchasedCredits: true,
          createdAt: true, updatedAt: true,
          _count: { select: { downloads: true, subscriptions: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const now = Date.now();
    return NextResponse.json({
      ok: true,
      data: {
        users: users.map((u) => {
          // Keep this list read-only. A due Free account receives this balance
          // on its next account/tool read; that path records the refill ledger.
          const freeRefillDue = u.plan === 'FREE'
            && (!u.planCreditsResetAt || u.planCreditsResetAt.getTime() <= now);
          const planCredits = freeRefillDue ? TIER_ALLOWANCE.FREE.credits : u.planCredits;
          return {
            id: u.id,
            name: u.name,
            email: u.email,
            image: u.image,
            role: u.role,
            plan: u.plan,
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
            planCredits,
            purchasedCredits: u.purchasedCredits,
            totalCredits: planCredits + u.purchasedCredits,
            _count: u._count,
          };
        }),
        total,
        page,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    const code = databaseErrorCode(error);
    const transient = code ? TRANSIENT_DATABASE_CODES.has(code) : false;
    console.error('Admin users query failed', { requestId, code, transient, error });
    return NextResponse.json(
      { ok: false, error: transient ? 'Users are temporarily unavailable.' : 'Unable to load users.', requestId },
      { status: transient ? 503 : 500 },
    );
  }
}
