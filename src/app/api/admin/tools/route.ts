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

  // Attach usage counts
  const usageCounts = await prisma.download.groupBy({
    by: ['tool'], _count: { tool: true },
  });
  const usageMap = Object.fromEntries(usageCounts.map((r) => [r.tool, r._count.tool]));

  const tools = configs.map((c) => ({
    ...c,
    updatedAt: c.updatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    usageTotal: usageMap[c.slug] ?? 0,
  }));

  return NextResponse.json({ ok: true, data: { tools } });
}
