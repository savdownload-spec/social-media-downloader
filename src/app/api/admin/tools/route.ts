import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { catalog } from '@/config/catalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() { return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 }); }

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  // Ensure all catalog tools have a ToolConfig row
  const existingSlugs = await prisma.toolConfig.findMany({ select: { slug: true } });
  const slugSet = new Set(existingSlugs.map((t) => t.slug));
  const missing = catalog.filter((t) => !slugSet.has(t.slug));
  if (missing.length) {
    await prisma.toolConfig.createMany({
      data: missing.map((t) => ({
        slug: t.slug,
        name: t.name,
        category: t.group,
        status: 'LIVE',
        creditCost: 0,
        freeLimit: 0,
      })),
      skipDuplicates: true,
    });
  }

  const configs = await prisma.toolConfig.findMany({ orderBy: { name: 'asc' } });

  // Admin status totals must reflect the operation ledger at request time.
  const usageCounts = await prisma.download.groupBy({
    by: ['tool', 'status'],
    _count: { _all: true },
  });
  const usageMap: Record<string, { total: number; success: number; failed: number; inProgress: number }> = {};
  for (const row of usageCounts) {
    const counts = usageMap[row.tool] ?? { total: 0, success: 0, failed: 0, inProgress: 0 };
    counts.total += row._count._all;
    if (row.status === 'success') counts.success += row._count._all;
    else if (row.status === 'failed') counts.failed += row._count._all;
    else if (row.status === 'pending' || row.status === 'processing') counts.inProgress += row._count._all;
    usageMap[row.tool] = counts;
  }

  const tools = configs.map((c) => ({
    ...c,
    updatedAt: c.updatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    usageTotal: usageMap[c.slug]?.total ?? 0,
    usageSuccess: usageMap[c.slug]?.success ?? 0,
    usageFailed: usageMap[c.slug]?.failed ?? 0,
    usageInProgress: usageMap[c.slug]?.inProgress ?? 0,
  }));

  return NextResponse.json({ ok: true, data: { tools } });
}
