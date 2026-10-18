import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reviewUpdateSchema } from '@/lib/auth/validators';
import { ok, fail } from '@/lib/api';
import { revalidateReviews } from '@/lib/reviews-server';
import { createHash } from 'crypto';
import { createAdminNotification } from '@/lib/admin-notifications';

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

  // If the review was approved, editing it moves it back to PENDING so the
  // approved count drops — bust the cache.
  if (wasApproved) {
    const revision = createHash('sha256').update(`${rating ?? updated.rating}:${reviewText ?? updated.review}:${role ?? updated.role}:${company ?? updated.company}`).digest('hex').slice(0, 20);
    await prisma.$transaction(async (tx) => {
      await tx.adminNotification.updateMany({ where: { entityType: 'Review', entityId: updated.id, type: 'REVIEW_MODERATION', resolvedAt: null }, data: { resolvedAt: new Date() } });
      await createAdminNotification(tx, {
        type: 'REVIEW_MODERATION', section: 'reviews', entityType: 'Review', entityId: updated.id,
        title: 'Edited review awaiting approval', message: updated.review.slice(0, 180),
        href: `/admin/reviews?reviewId=${updated.id}`, dedupeKey: `review:edit:${updated.id}:${revision}`,
      });
    });
    revalidateReviews();
  }

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

  await prisma.$transaction([
    prisma.review.delete({ where: { id: params.id } }),
    prisma.adminNotification.updateMany({ where: { entityType: 'Review', entityId: params.id, resolvedAt: null }, data: { resolvedAt: new Date() } }),
  ]);

  revalidateReviews();
  return ok({ message: 'Review deleted.' });
}
