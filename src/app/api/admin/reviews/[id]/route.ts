import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { adminEditSchema, adminActionSchema } from '@/lib/auth/validators';
import { ok, fail } from '@/lib/api';
import { revalidateReviews } from '@/lib/reviews-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return fail('Forbidden.', 403);
  }

  const review = await prisma.review.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!review) return fail('Review not found.', 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body.');
  }

  // Either a content edit or a status/feature action.
  if (body && typeof body === 'object' && 'action' in body) {
    const action = adminActionSchema.safeParse(body);
    if (!action.success) return fail('Invalid action.');

    switch (action.data.action) {
      case 'approve':
        await prisma.$transaction([
          prisma.review.update({ where: { id: params.id }, data: { status: 'APPROVED', approved: true, approvedAt: new Date() } }),
          prisma.adminNotification.updateMany({ where: { entityType: 'Review', entityId: params.id, resolvedAt: null }, data: { resolvedAt: new Date() } }),
        ]);
        revalidateReviews();
        return ok({ message: 'Review approved.' });
      case 'reject':
        await prisma.$transaction([
          prisma.review.update({ where: { id: params.id }, data: {
            status: 'REJECTED',
            approved: false,
            approvedAt: null,
            featured: false,
          } }),
          prisma.adminNotification.updateMany({ where: { entityType: 'Review', entityId: params.id, resolvedAt: null }, data: { resolvedAt: new Date() } }),
        ]);
        revalidateReviews();
        return ok({ message: 'Review rejected.' });
      case 'feature':
        await prisma.review.update({
          where: { id: params.id },
          data: { featured: true },
        });
        revalidateReviews();
        return ok({ message: 'Review featured.' });
      case 'unfeature':
        await prisma.review.update({
          where: { id: params.id },
          data: { featured: false },
        });
        revalidateReviews();
        return ok({ message: 'Review unfeatured.' });
    }
  }

  const parsed = adminEditSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const { rating, review: reviewText, role, company } = parsed.data;

  const updated = await prisma.review.update({
    where: { id: params.id },
    data: {
      ...(rating !== undefined ? { rating } : {}),
      ...(reviewText !== undefined ? { review: reviewText } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(company !== undefined ? { company } : {}),
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

  revalidateReviews();
  return ok(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') {
    return fail('Forbidden.', 403);
  }

  const review = await prisma.review.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!review) return fail('Review not found.', 404);

  await prisma.$transaction([
    prisma.review.delete({ where: { id: params.id } }),
    prisma.adminNotification.updateMany({ where: { entityType: 'Review', entityId: params.id, resolvedAt: null }, data: { resolvedAt: new Date() } }),
  ]);

  revalidateReviews();
  return ok({ message: 'Review deleted.' });
}
