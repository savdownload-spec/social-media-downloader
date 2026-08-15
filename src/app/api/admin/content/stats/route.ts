import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const [
    total,
    published,
    drafts,
    scoreAgg,
    missingMetaDescription,
    missingFeaturedImage,
    recentlyUpdated,
    needsAttention,
  ] = await Promise.all([
    prisma.post.count(),
    prisma.post.count({ where: { published: true } }),
    prisma.post.count({ where: { published: false } }),
    prisma.post.aggregate({ _avg: { seoScore: true, readabilityScore: true } }),
    prisma.post.count({ where: { AND: [{ metaDescription: null }, { excerpt: null }] } }),
    prisma.post.count({ where: { coverImage: null } }),
    prisma.post.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, slug: true, updatedAt: true, seoScore: true },
    }),
    prisma.post.findMany({
      where: { OR: [{ seoScore: { lt: 60 } }, { seoScore: null }] },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, slug: true, seoScore: true, published: true },
    }),
  ]);

  // Alt-text and internal-link coverage require reading contentJson —
  // sampled server-side rather than a full-table scan on every dashboard load.
  const postsWithContent = await prisma.post.findMany({
    select: { id: true, contentJson: true },
    take: 500,
  });
  let missingAltText = 0;
  let missingInternalLinks = 0;
  const { analyzeContentJson } = await import('@/lib/content-studio/contentText');
  for (const p of postsWithContent) {
    const analysis = analyzeContentJson(p.contentJson as never);
    if (analysis.images.some((img) => !img.hasAlt)) missingAltText += 1;
    if (analysis.images.length === 0 && analysis.wordCount === 0) continue; // no rich content saved yet, skip
    if (analysis.internalLinks === 0) missingInternalLinks += 1;
  }

  return NextResponse.json({
    ok: true,
    data: {
      total,
      published,
      drafts,
      avgSeoScore: Math.round(scoreAgg._avg.seoScore ?? 0),
      avgReadabilityScore: Math.round(scoreAgg._avg.readabilityScore ?? 0),
      missingMetaDescription,
      missingFeaturedImage,
      missingAltText,
      missingInternalLinks,
      recentlyUpdated: recentlyUpdated.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() })),
      needsAttention,
    },
  });
}
