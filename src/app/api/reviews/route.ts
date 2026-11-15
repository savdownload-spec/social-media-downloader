import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reviewCreateSchema } from '@/lib/auth/validators';
import { ok, fail } from '@/lib/api';
import { createAdminNotification } from '@/lib/admin-notifications';
import { getPublishedReviews } from '@/lib/reviews-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const featured = searchParams.get('featured') === 'true';
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10) || 20;
    const offset = Number.parseInt(searchParams.get('offset') || '0', 10) || 0;

    return ok(await getPublishedReviews({ platform, featured, limit, offset }));
  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return fail('Failed to fetch reviews', 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return fail('Please log in to share your experience.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) {
      return fail('Account not found. Please log in again.', 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail('Invalid request body.');
    }

    const parsed = reviewCreateSchema.safeParse(body);
    if (!parsed.success) {
      return fail(parsed.error.errors[0]?.message ?? 'Invalid input.');
    }

    const { rating, review, role, company, platform } = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
        userId: user.id,
        name: user.name ?? (user.email ? user.email.split('@')[0] : 'SavDown User'),
        email: user.email ?? null,
        role: role ?? user.jobTitle ?? null,
        company: company ?? user.company ?? null,
        platform,
        rating,
        review,
        photo: user.image,
        status: 'PENDING',
        approved: false,
        featured: false,
      },
        select: {
        id: true,
        rating: true,
        review: true,
        status: true,
        createdAt: true,
        },
      });
      await createAdminNotification(tx, {
        type: 'REVIEW_MODERATION', section: 'reviews', entityType: 'Review', entityId: newReview.id,
        title: 'Review awaiting approval', message: review.slice(0, 180),
        href: `/admin/reviews?reviewId=${newReview.id}`, dedupeKey: `review:pending:${newReview.id}`,
      });
      return newReview;
    });

    return ok(created, 201);
  } catch (error) {
    console.error('Failed to create review:', error);
    return fail('Failed to submit review.', 500);
  }
}
