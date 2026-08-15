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

const updateSchema = z.object({
  title: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1).optional(),
  author: z.string().optional(),
  tagsJson: z.string().optional(),
  category: z.string().optional(),
  coverImage: z.string().optional(),
  coverAlt: z.string().optional(),
  ogImage: z.string().optional(),
  primaryKeyword: z.string().optional(),
  secondaryKeywordsJson: z.string().optional(),
  canonicalUrl: z.string().optional(),
  toolSlug: z.string().optional(),
  readingTimeMinutes: z.coerce.number().int().positive().optional(),
  published: z.boolean().optional(),
  // Content Studio additions
  contentJson: z.any().optional(),
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  focusKeyphrase: z.string().optional(),
  synonymsJson: z.string().optional(),
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
  metaRobotsAdvanced: z.string().optional(),
  breadcrumbTitle: z.string().optional(),
  schemaType: z.string().optional(),
  faqJson: z.string().optional(),
  howToJson: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
  changeSummary: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid' }, { status: 400 });

  const existing = await prisma.post.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const slugTaken = await prisma.post.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
    if (slugTaken) return NextResponse.json({ ok: false, error: 'A post with this slug already exists.' }, { status: 409 });
  }

  const { changeSummary, ...fields } = parsed.data;
  const data: Record<string, unknown> = { ...fields };

  if (fields.published && !existing.published) data.publishedAt = new Date();
  if (fields.published === false) data.publishedAt = null;
  // Scheduling: a future scheduledAt with published left false marks the
  // post as "Scheduled" in the UI; due posts are flipped live by the
  // best-effort sweep in the list/public read paths (no cron infra exists).
  if (fields.scheduledAt && fields.scheduledAt > new Date() && fields.published !== true) {
    data.published = false;
    data.publishedAt = null;
  }

  const scores = computeScores({
    title: fields.title ?? existing.title,
    seoTitle: fields.seoTitle ?? existing.seoTitle,
    slug: fields.slug ?? existing.slug,
    excerpt: fields.excerpt ?? existing.excerpt,
    metaDescription: fields.metaDescription ?? existing.metaDescription,
    focusKeyphrase: fields.focusKeyphrase ?? existing.focusKeyphrase,
    synonymsJson: fields.synonymsJson ?? existing.synonymsJson,
    coverImage: fields.coverImage ?? existing.coverImage,
    coverAlt: fields.coverAlt ?? existing.coverAlt,
    canonicalUrl: fields.canonicalUrl ?? existing.canonicalUrl,
    contentJson: fields.contentJson ?? existing.contentJson,
  });
  Object.assign(data, scores);

  const [, post] = await prisma.$transaction([
    prisma.postRevision.create({
      data: {
        postId: existing.id,
        snapshotJson: JSON.parse(JSON.stringify(existing)),
        changeSummary: changeSummary || null,
        authorId: admin.id || null,
        authorEmail: admin.email || null,
      },
    }),
    prisma.post.update({ where: { id: params.id }, data }),
  ]);

  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'content.update', targetType: 'Post', targetId: params.id });

  return NextResponse.json({ ok: true, data: post });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  await prisma.post.delete({ where: { id: params.id } });
  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'content.delete', targetType: 'Post', targetId: params.id });

  return NextResponse.json({ ok: true, data: { message: 'Post deleted' } });
}
