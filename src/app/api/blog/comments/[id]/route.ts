import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';

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
    await prisma.blogComment.update({ where: { id: comment.id }, data: { body: text, status: 'PENDING', approvedAt: null, moderatedAt: null, moderatedById: null } });
    return ok({ message: 'Comment updated and queued for review.' });
  }
  if (action === 'report') {
    if (comment.userId === user.id) return fail('You cannot report your own comment.');
    const reason = typeof body.body === 'string' ? body.body.trim().slice(0, 500) : 'Reader report';
    await prisma.blogComment.update({ where: { id: comment.id }, data: { reportReason: reason || 'Reader report', reportedAt: new Date() } });
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
  await prisma.blogComment.delete({ where: { id: comment.id } });
  return ok({ message: 'Comment deleted.' });
}