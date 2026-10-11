import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PRIVATE_NO_STORE_HEADERS, requireAdminApi } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;

  const [totalDownloads, totalUsers, totalSubs, byTool] = await Promise.all([
    prisma.download.count(),
    prisma.user.count(),
    prisma.newsletterSubscriber.count(),
    prisma.download.groupBy({
      by: ['tool'],
      _count: { tool: true },
      orderBy: { _count: { tool: 'desc' } },
      take: 10,
    }),
  ]);

  return NextResponse.json({
    totalDownloads,
    totalUsers,
    totalSubs,
    byTool: byTool.map((r) => ({ tool: r.tool, count: r._count.tool })),
  }, { headers: PRIVATE_NO_STORE_HEADERS });
}
