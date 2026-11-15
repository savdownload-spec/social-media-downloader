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

export type PublicReview = {
  id: string;
  name: string;
  photo: string | null;
  role: string | null;
  company: string | null;
  platform: string;
  rating: number;
  review: string;
  createdAt: string;
  featured: boolean;
  userId: string | null;
};

export type PublicReviewList = {
  reviews: PublicReview[];
  total: number;
  hasMore: boolean;
  averageRating: number | null;
  reviewCount: number;
};

type ReviewListParams = {
  platform?: string | null;
  featured?: boolean;
  limit?: number;
  offset?: number;
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

async function readPublishedReviews(
  platform: string,
  featured: boolean,
  limit: number,
  offset: number,
): Promise<PublicReviewList> {
  const where: { status: string; approved: boolean; platform?: string; featured?: boolean } = {
    status: 'APPROVED',
    approved: true,
  };
  if (platform && platform !== 'all') where.platform = platform;
  if (featured) where.featured = true;

  const [reviews, total, ratingAgg] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(limit, 50),
      skip: offset,
      select: {
        id: true,
        name: true,
        photo: true,
        role: true,
        company: true,
        platform: true,
        rating: true,
        review: true,
        createdAt: true,
        featured: true,
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            jobTitle: true,
            company: true,
          },
        },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true }, _count: { rating: true } }),
  ]);

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      name: r.user?.name ?? r.name,
      photo: r.user?.image ?? r.photo ?? null,
      role: r.user ? r.user.jobTitle : r.role,
      company: r.user ? r.user.company : r.company,
      platform: r.platform,
      rating: r.rating,
      review: r.review,
      createdAt: r.createdAt.toISOString(),
      featured: r.featured,
      userId: r.user?.id ?? null,
    })),
    total,
    hasMore: offset + reviews.length < total,
    averageRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
    reviewCount: ratingAgg._count.rating,
  };
}

const getCachedPublishedReviews = unstable_cache(
  readPublishedReviews,
  ['published-reviews'],
  { tags: [REVIEWS_CACHE_TAG], revalidate: 300 },
);

/** Approved reviews for both the public API and the server-rendered reviews page. */
export async function getPublishedReviews(params: ReviewListParams = {}): Promise<PublicReviewList> {
  try {
    return await getCachedPublishedReviews(
      params.platform ?? 'all',
      params.featured ?? false,
      Math.min(params.limit ?? 50, 50),
      params.offset ?? 0,
    );
  } catch {
    return { reviews: [], total: 0, hasMore: false, averageRating: null, reviewCount: 0 };
  }
}

/** Call after any moderation action so every server surface picks up fresh totals. */
export function revalidateReviews(): void {
  revalidateTag(REVIEWS_CACHE_TAG);
}
