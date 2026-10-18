import 'server-only';
import { unstable_cache, revalidateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Server-side source of truth for the approved review summary.
 *
 * Uses the same `{ status: 'APPROVED', approved: true }` predicate as the
 * public GET /api/reviews route so the numbers are always consistent.
 * Wrapped in `unstable_cache` so it doesn't hit the DB on every render;
 * `revalidateReviews()` busts the cache after any moderation action.
 */

export const REVIEWS_CACHE_TAG = 'reviews';

export type ReviewSummary = {
  averageRating: number | null;
  totalApproved: number;
};

async function readReviewSummaryFromDb(): Promise<ReviewSummary> {
  try {
    const agg = await prisma.review.aggregate({
      where: { status: 'APPROVED', approved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });
    return {
      averageRating:
        agg._avg.rating != null
          ? Math.round(agg._avg.rating * 10) / 10
          : null,
      totalApproved: agg._count.rating,
    };
  } catch {
    return { averageRating: null, totalApproved: 0 };
  }
}

const getCachedReviewSummary = unstable_cache(
  readReviewSummaryFromDb,
  ['review-summary'],
  { tags: [REVIEWS_CACHE_TAG], revalidate: 300 },
);

/** The single entry point every server surface uses to read review stats. */
export async function getReviewSummary(): Promise<ReviewSummary> {
  return getCachedReviewSummary();
}

/** Call after any moderation action so every server surface picks up fresh totals. */
export function revalidateReviews(): void {
  revalidateTag(REVIEWS_CACHE_TAG);
}
