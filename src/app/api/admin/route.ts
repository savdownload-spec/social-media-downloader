import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
  });
}
