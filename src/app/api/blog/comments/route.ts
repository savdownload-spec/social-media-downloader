import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { getPublicBlogPost } from '@/lib/blog';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function currentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { session, user: null };
  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true, name: true, image: true, email: true } });
  return { session, user };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug')?.trim();
  if (!slug) return fail('Article slug is required.');
  try {
    const { session, user } = await currentUser();
    const comments = await prisma.blogComment.findMany({
      where: { postSlug: slug, ...(user ? { OR: [{ status: 'APPROVED' }, { userId: user.id }] } : { status: 'APPROVED' }) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, body: true, status: true, createdAt: true, updatedAt: true, userId: true, user: { select: { name: true, image: true, email: true } } },
    });
    return ok({ comments: comments.map((comment) => ({ id: comment.id, body: comment.body, status: comment.status, createdAt: comment.createdAt, updatedAt: comment.updatedAt, isOwner: comment.userId === user?.id, canModerate: session?.user?.role === 'ADMIN', user: { name: comment.user.name ?? comment.user.email?.split('@')[0] ?? 'SavDown reader', image: comment.user.image } })) });
  } catch {
    // Blog reading remains available when the optional discussion data store is unavailable.
    return ok({ comments: [], unavailable: true });
  }
}

export async function POST(request: Request) {
  let body: { slug?: unknown; body?: unknown };
  try { body = await request.json(); } catch { return fail('Invalid request body.'); }
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  const text = typeof body.body === 'string' ? body.body.trim() : '';
  if (!slug || text.length < 2 || text.length > 2000) return fail('Comments must be between 2 and 2,000 characters.');
  try {
    const { user } = await currentUser();
    if (!user) return fail('Please sign in to join the conversation.', 401);
    if (!(await getPublicBlogPost(slug))) return fail('Article not found.', 404);
    const comment = await prisma.blogComment.create({ data: { postSlug: slug, userId: user.id, body: text, status: 'PENDING' }, select: { id: true, status: true, createdAt: true } });
    return ok(comment, 201);
  } catch {
    return fail('Comments are temporarily unavailable. Please try again shortly.', 503);
  }
}