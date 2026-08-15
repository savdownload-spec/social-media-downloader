import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN' || !session.user.id) return fail('Forbidden.', 403);
  const comment = await prisma.blogComment.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!comment) return fail('Comment not found.', 404);
  let body: { action?: unknown };
  try { body = await request.json(); } catch { return fail('Invalid request body.'); }
  const action = body.action;
  const updateByAction = {
    approve: { status: 'APPROVED', approvedAt: new Date(), moderatedAt: new Date(), moderatedById: session.user.id, reportReason: null, reportedAt: null },
    hide: { status: 'HIDDEN', approvedAt: null, moderatedAt: new Date(), moderatedById: session.user.id },
    reject: { status: 'REJECTED', approvedAt: null, moderatedAt: new Date(), moderatedById: session.user.id },
  } as const;
  if (action !== 'approve' && action !== 'hide' && action !== 'reject') return fail('Unsupported action.');
  await prisma.blogComment.update({ where: { id: comment.id }, data: updateByAction[action] });
  await writeAuditLog({ adminId: session.user.id, adminEmail: session.user.email ?? 'admin', action: `COMMENT_${action.toUpperCase()}`, targetType: 'BLOG_COMMENT', targetId: comment.id });
  return ok({ message: `Comment ${action}d.` });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN' || !session.user.id) return fail('Forbidden.', 403);
  const comment = await prisma.blogComment.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!comment) return fail('Comment not found.', 404);
  await prisma.blogComment.delete({ where: { id: comment.id } });
  await writeAuditLog({ adminId: session.user.id, adminEmail: session.user.email ?? 'admin', action: 'COMMENT_DELETE', targetType: 'BLOG_COMMENT', targetId: comment.id });
  return ok({ message: 'Comment deleted.' });
}