import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PRIVATE_NO_STORE_HEADERS, requireAdminApi } from '@/lib/admin-auth';
import {
  buildOperationWhere,
  resolveAdminDateRange,
  safePage,
  safePageSize,
} from '@/lib/admin-analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi(req);
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const range = resolveAdminDateRange(sp.get('days'));
  const page = safePage(sp.get('page'));
  const pageSize = safePageSize(sp.get('pageSize'), 25, 50);
  const search = sp.get('search')?.trim().slice(0, 100) ?? '';
  const tool = sp.get('tool')?.trim().slice(0, 100) ?? '';
  const platform = sp.get('platform')?.trim().slice(0, 100) ?? '';
  const status = sp.get('status')?.trim().slice(0, 30) ?? '';
  const where = buildOperationWhere({ range, search, tool, platform, status });

  const sqlFilters: Prisma.Sql[] = [
    Prisma.sql`"createdAt" >= ${range.start}`,
    Prisma.sql`"createdAt" < ${range.end}`,
  ];
  if (tool) sqlFilters.push(Prisma.sql`"tool" = ${tool}`);
  if (platform) sqlFilters.push(Prisma.sql`"platform" = ${platform}`);
  if (status) sqlFilters.push(Prisma.sql`"status" = ${status}`);
  if (search) {
    const contains = `%${search}%`;
    sqlFilters.push(Prisma.sql`("tool" ILIKE ${contains} OR "platform" ILIKE ${contains})`);
  }

  const [downloads, total, byTool, byStatus, groupedDays, toolOptions, platformOptions] = await Promise.all([
    prisma.download.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, tool: true, platform: true, status: true, creditCost: true, createdAt: true },
    }),
    prisma.download.count({ where }),
    prisma.download.groupBy({
      by: ['tool'], where, _count: { tool: true },
      orderBy: { _count: { tool: 'desc' } }, take: 10,
    }),
    prisma.download.groupBy({ by: ['status'], where, _count: { status: true } }),
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(Prisma.sql`
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS day,
             COUNT(*)::bigint AS count
      FROM "Download"
      WHERE ${Prisma.join(sqlFilters, ' AND ')}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    prisma.download.findMany({ where: { createdAt: { gte: range.start, lt: range.end } }, distinct: ['tool'], orderBy: { tool: 'asc' }, select: { tool: true } }),
    prisma.download.findMany({ where: { createdAt: { gte: range.start, lt: range.end } }, distinct: ['platform'], orderBy: { platform: 'asc' }, select: { platform: true } }),
  ]);

  const dayCounts = new Map(groupedDays.map((row) => [new Date(row.day).toISOString().slice(0, 10), Number(row.count)]));
  const byDay = Array.from({ length: range.days }, (_, index) => {
    const day = new Date(range.start);
    day.setUTCDate(day.getUTCDate() + index);
    const key = day.toISOString().slice(0, 10);
    return { key, label: day.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }), value: dayCounts.get(key) ?? 0 };
  });

  return NextResponse.json({
    ok: true,
    data: {
      downloads: downloads.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      byTool: byTool.map((row) => ({ tool: row.tool, count: row._count.tool })),
      byStatus: byStatus.map((row) => ({ status: row.status, count: row._count.status })),
      byDay,
      filters: { tools: toolOptions.map((row) => row.tool), platforms: platformOptions.map((row) => row.platform), statuses: ['success', 'failed', 'pending', 'cancelled'] },
      range: { ...range, start: range.start.toISOString(), end: range.end.toISOString() },
    },
  }, { headers: PRIVATE_NO_STORE_HEADERS });
}
