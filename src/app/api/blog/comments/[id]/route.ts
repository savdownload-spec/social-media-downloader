import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { createAdminNotification } from '@/lib/admin-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await authenticatedUser();
  if (!user) return fail('Please sign in to manage comments.', 401);
  const comment = await prisma.blogComment.findUnique({ where: { id: params.id }, select: { id: true, userId: true } });
  if (!comment) return fail('Comment not found.', 404);
  let body: { action?: unknown; body?: unknown };
  try { body = await request.json(); } catch { return fail('Invalid request body.'); }
  const action = body.action;
  if (action === 'edit') {
    if (comment.userId !== user.id) return fail('You can only edit your own comments.', 403);
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (text.length < 2 || text.length > 2000) return fail('Comments must be between 2 and 2,000 characters.');
    const revision = createHash('sha256').update(text).digest('hex').slice(0, 20);
    await prisma.$transaction(async (tx) => {
      await tx.blogComment.update({ where: { id: comment.id }, data: { body: text, status: 'PENDING', approvedAt: null, moderatedAt: null, moderatedById: null } });
      await tx.adminNotification.updateMany({ where: { entityType: 'BlogComment', entityId: comment.id, type: 'COMMENT_MODERATION', resolvedAt: null }, data: { resolvedAt: new Date() } });
      await createAdminNotification(tx, {
        type: 'COMMENT_MODERATION', section: 'comments', entityType: 'BlogComment', entityId: comment.id,
        title: 'Edited comment awaiting moderation', message: text.slice(0, 180),
        href: `/admin/comments?commentId=${comment.id}`, dedupeKey: `comment:edit:${comment.id}:${revision}`,
      });
    });
    return ok({ message: 'Comment updated and queued for review.' });
  }
  if (action === 'report') {
    if (comment.userId === user.id) return fail('You cannot report your own comment.');
    const reason = typeof body.body === 'string' ? body.body.trim().slice(0, 500) : 'Reader report';
    await prisma.$transaction(async (tx) => {
      await tx.blogComment.update({ where: { id: comment.id }, data: { reportReason: reason || 'Reader report', reportedAt: new Date() } });
      await createAdminNotification(tx, {
        type: 'COMMENT_REPORTED', section: 'comments', entityType: 'BlogComment', entityId: comment.id,
        title: 'Blog comment reported', message: (reason || 'Reader report').slice(0, 180),
        href: `/admin/comments?commentId=${comment.id}`, dedupeKey: `comment:reported:${comment.id}`,
      });
    });
    return ok({ message: 'Comment reported.' });
  }
  return fail('Unsupported action.');
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await authenticatedUser();
  if (!user) return fail('Please sign in to manage comments.', 401);
  const comment = await prisma.blogComment.findUnique({ where: { id: params.id }, select: { id: true, userId: true } });
  if (!comment) return fail('Comment not found.', 404);
  if (comment.userId !== user.id) return fail('You can only delete your own comments.', 403);
  await prisma.$transaction([
    prisma.blogComment.delete({ where: { id: comment.id } }),
    prisma.adminNotification.updateMany({ where: { entityType: 'BlogComment', entityId: comment.id, resolvedAt: null }, data: { resolvedAt: new Date() } }),
  ]);
  return ok({ message: 'Comment deleted.' });
}
