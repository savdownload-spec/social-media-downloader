import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reviewUpdateSchema } from '@/lib/auth/validators';
import { ok, fail } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in.', 401);

  const review = await prisma.review.findUnique({
    where: { id: params.id },
    select: { userId: true, status: true },
  });

  if (!review) return fail('Review not found.', 404);
  if (review.userId !== userId) {
    return fail('You can only edit your own reviews.', 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body.');
  }

  const parsed = reviewUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const { rating, review: reviewText, role, company } = parsed.data;

  const wasApproved = review.status === 'APPROVED';

  // Editing an approved review returns it to moderation (Pending) so
  // unmoderated changes never appear publicly.
  const updated = await prisma.review.update({
    where: { id: params.id },
    data: {
      ...(rating !== undefined ? { rating } : {}),
      ...(reviewText !== undefined ? { review: reviewText } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(company !== undefined ? { company } : {}),
      ...(wasApproved
        ? {
            status: 'PENDING',
            approved: false,
            approvedAt: null,
            featured: false,
          }
        : {}),
    },
    select: {
      id: true,
      rating: true,
      review: true,
      role: true,
      company: true,
      status: true,
      featured: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return ok(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in.', 401);

  const review = await prisma.review.findUnique({
    where: { id: params.id },
    select: { userId: true },
  });

  if (!review) return fail('Review not found.', 404);
  if (review.userId !== userId) {
    return fail('You can only delete your own reviews.', 403);
  }

  await prisma.review.delete({ where: { id: params.id } });

  return ok({ message: 'Review deleted.' });
}
