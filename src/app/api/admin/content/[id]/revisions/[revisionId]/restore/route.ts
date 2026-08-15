import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

const RESTORABLE_FIELDS = [
  'title', 'slug', 'excerpt', 'content', 'author', 'tagsJson', 'category',
  'coverImage', 'coverAlt', 'ogImage', 'primaryKeyword', 'secondaryKeywordsJson',
  'canonicalUrl', 'toolSlug', 'readingTimeMinutes', 'published',
  'contentJson', 'seoTitle', 'metaDescription', 'focusKeyphrase', 'synonymsJson',
  'noIndex', 'noFollow', 'metaRobotsAdvanced', 'breadcrumbTitle', 'schemaType',
  'faqJson', 'howToJson', 'ogTitle', 'ogDescription', 'seoScore', 'readabilityScore', 'wordCount',
] as const;

export async function POST(_req: Request, { params }: { params: { id: string; revisionId: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const [existing, revision] = await Promise.all([
    prisma.post.findUnique({ where: { id: params.id } }),
    prisma.postRevision.findUnique({ where: { id: params.revisionId } }),
  ]);
  if (!existing || !revision || revision.postId !== params.id) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const snapshot = revision.snapshotJson as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const field of RESTORABLE_FIELDS) {
    if (field in snapshot) data[field] = snapshot[field];
  }

  // Snapshot the pre-restore state first, so restoring is itself undoable.
  const [, post] = await prisma.$transaction([
    prisma.postRevision.create({
      data: {
        postId: existing.id,
        snapshotJson: JSON.parse(JSON.stringify(existing)),
        changeSummary: `Before restoring revision from ${revision.createdAt.toISOString()}`,
        authorId: admin.id || null,
        authorEmail: admin.email || null,
      },
    }),
    prisma.post.update({ where: { id: params.id }, data }),
  ]);

  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'content.revision.restore', targetType: 'Post', targetId: params.id });

  return NextResponse.json({ ok: true, data: post });
}
