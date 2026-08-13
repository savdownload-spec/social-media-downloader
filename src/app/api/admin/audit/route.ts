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
  const pageSize = Math.min(100, parseInt(sp.get('pageSize') ?? '25', 10));
  const search   = sp.get('search')?.trim() ?? '';
  const action   = sp.get('action') ?? '';

  const where: Record<string, unknown> = {};
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (search) where.OR = [
    { adminEmail: { contains: search, mode: 'insensitive' } },
    { action:     { contains: search, mode: 'insensitive' } },
    { targetId:   { contains: search, mode: 'insensitive' } },
  ];

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      logs: logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
      total, page, totalPages: Math.ceil(total / pageSize),
    },
  });
}
