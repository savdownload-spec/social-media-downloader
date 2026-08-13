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
  const days     = parseInt(sp.get('days') ?? '30', 10);
  const page     = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const pageSize = Math.min(50, parseInt(sp.get('pageSize') ?? '25', 10));
  const search   = sp.get('search')?.trim() ?? '';
  const tool     = sp.get('tool') ?? '';
  const status   = sp.get('status') ?? '';

  const since = new Date(); since.setDate(since.getDate() - days);
  const where: Record<string, unknown> = { createdAt: { gte: since } };
  if (tool)   where.tool   = tool;
  if (status) where.status = status;
  if (search) where.OR = [
    { tool:     { contains: search, mode: 'insensitive' } },
    { platform: { contains: search, mode: 'insensitive' } },
  ];

  const [downloads, total, byTool, byStatus, byDay] = await Promise.all([
    prisma.download.findMany({
      where, orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, tool: true, platform: true, status: true, createdAt: true },
    }),
    prisma.download.count({ where }),
    prisma.download.groupBy({ by: ['tool'], where: { createdAt: { gte: since } }, _count: { tool: true }, orderBy: { _count: { tool: 'desc' } }, take: 10 }),
    prisma.download.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { status: true } }),
    // last 14 days
    Promise.all(
      Array.from({ length: 14 }, (_, i) => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const d = new Date(today); d.setDate(d.getDate() - (13 - i));
        const next = new Date(d); next.setDate(next.getDate() + 1);
        return prisma.download.count({ where: { createdAt: { gte: d, lt: next } } })
          .then((c) => ({ label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), value: c }));
      })
    ),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      downloads: downloads.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
      total, page, totalPages: Math.ceil(total / pageSize),
      byTool: byTool.map((r) => ({ tool: r.tool, count: r._count.tool })),
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count.status })),
      byDay,
    },
  });
}
