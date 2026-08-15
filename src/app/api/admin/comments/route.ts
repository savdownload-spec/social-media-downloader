import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') return fail('Forbidden.', 403);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search')?.trim();
  const postSlug = searchParams.get('postSlug')?.trim();
  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') || '20', 10), 1), 100);
  const where: Prisma.BlogCommentWhereInput = {};
  if (status && ['PENDING', 'APPROVED', 'HIDDEN', 'REJECTED'].includes(status)) where.status = status;
  if (postSlug) where.postSlug = postSlug;
  if (search) where.OR = [{ body: { contains: search } }, { postSlug: { contains: search } }, { user: { name: { contains: search } } }, { user: { email: { contains: search } } }];
  const [comments, total] = await Promise.all([
    prisma.blogComment.findMany({ where, orderBy: [{ reportedAt: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * pageSize, take: pageSize, select: { id: true, postSlug: true, body: true, status: true, reportReason: true, reportedAt: true, createdAt: true, updatedAt: true, approvedAt: true, moderatedAt: true, user: { select: { id: true, name: true, email: true, image: true } }, moderator: { select: { name: true, email: true } } } }),
    prisma.blogComment.count({ where }),
  ]);
  return ok({ comments, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
}