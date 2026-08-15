import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { computeScores } from '@/lib/content-studio/computeScores';
import { z } from 'zod';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

const postFields = {
  title: z.string().min(2),
  slug: z.string().min(2),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  author: z.string().default('Editorial Team'),
  tagsJson: z.string().default('[]'),
  category: z.string().default('Guides'),
  coverImage: z.string().optional(),
  coverAlt: z.string().optional(),
  ogImage: z.string().optional(),
  primaryKeyword: z.string().optional(),
  secondaryKeywordsJson: z.string().default('[]'),
  canonicalUrl: z.string().optional(),
  toolSlug: z.string().optional(),
  readingTimeMinutes: z.coerce.number().int().positive().optional(),
  published: z.boolean().default(false),
  // Content Studio additions (all additive/optional — see prisma migration 20260815_content_studio_seo)
  contentJson: z.any().optional(),
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  focusKeyphrase: z.string().optional(),
  synonymsJson: z.string().default('[]'),
  noIndex: z.boolean().default(false),
  noFollow: z.boolean().default(false),
  metaRobotsAdvanced: z.string().optional(),
  breadcrumbTitle: z.string().optional(),
  schemaType: z.string().optional(),
  faqJson: z.string().default('[]'),
  howToJson: z.string().default('[]'),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string })?.role !== 'ADMIN') return forbidden();

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const pageSize = Math.min(50, parseInt(sp.get('pageSize') ?? '20', 10));
  const status = sp.get('status') ?? '';
  const search = sp.get('search')?.trim() ?? '';
  const attention = sp.get('attention') ?? ''; // 'needsAttention' | 'goodSeo'
  const sortBy = sp.get('sortBy') ?? 'createdAt'; // createdAt | updatedAt | publishedAt | seoScore | readabilityScore
  const sortDir = sp.get('sortDir') === 'asc' ? 'asc' : 'desc';

  // Best-effort: flip any due scheduled posts live before listing, so the
  // admin table reflects reality without needing a real cron.
  await prisma.post
    .updateMany({
      where: { published: false, scheduledAt: { lte: new Date() } },
      data: { published: true, publishedAt: new Date() },
    })
    .catch(() => undefined);

  const where: Record<string, unknown> = {};
  if (status === 'published') where.published = true;
  if (status === 'draft') where.published = false;
  if (search) where.OR = [
    { title: { contains: search, mode: 'insensitive' } },
    { excerpt: { contains: search, mode: 'insensitive' } },
    { category: { contains: search, mode: 'insensitive' } },
  ];
  if (attention === 'needsAttention') where.OR = [...(where.OR as unknown[] ?? []), { seoScore: { lt: 60 } }, { seoScore: null }];
  if (attention === 'goodSeo') where.seoScore = { gte: 80 };

  const orderBy: Record<string, 'asc' | 'desc'> = ['seoScore', 'readabilityScore', 'updatedAt', 'publishedAt'].includes(sortBy)
    ? { [sortBy]: sortDir }
    : { createdAt: sortDir };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: orderBy as unknown as { createdAt: 'asc' | 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        author: true,
        tagsJson: true,
        category: true,
        coverImage: true,
        coverAlt: true,
        ogImage: true,
        primaryKeyword: true,
        secondaryKeywordsJson: true,
        canonicalUrl: true,
        toolSlug: true,
        readingTimeMinutes: true,
        published: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        seoTitle: true,
        metaDescription: true,
        focusKeyphrase: true,
        synonymsJson: true,
        noIndex: true,
        noFollow: true,
        metaRobotsAdvanced: true,
        breadcrumbTitle: true,
        schemaType: true,
        faqJson: true,
        howToJson: true,
        ogTitle: true,
        ogDescription: true,
        scheduledAt: true,
        seoScore: true,
        readabilityScore: true,
        wordCount: true,
      },
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      posts: posts.map((post) => ({
        ...post,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        publishedAt: post.publishedAt?.toISOString() ?? null,
        scheduledAt: post.scheduledAt?.toISOString() ?? null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

const postSchema = z.object(postFields);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid', details: parsed.error.flatten() }, { status: 400 });

  const existingSlug = await prisma.post.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (existingSlug) {
    return NextResponse.json({ ok: false, error: 'A post with this slug already exists.' }, { status: 409 });
  }

  const scores = computeScores(parsed.data);

  const post = await prisma.post.create({
    data: {
      ...parsed.data,
      publishedAt: parsed.data.published ? new Date() : null,
      ...scores,
    },
  });

  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'content.create', targetType: 'Post', targetId: post.id });
  return NextResponse.json({ ok: true, data: post }, { status: 201 });
}
