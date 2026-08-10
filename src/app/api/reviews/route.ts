import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reviewCreateSchema } from '@/lib/auth/validators';
import { ok, fail } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = { status: 'APPROVED', approved: true };

    if (platform && platform !== 'all') {
      where.platform = platform;
    }

    if (featured === 'true') {
      where.featured = true;
    }

    const [reviews, total, ratingAgg] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: [
          { featured: 'desc' },
          { createdAt: 'desc' },
        ],
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
      prisma.review.aggregate({
        where,
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const pubReviews = reviews.map((r) => {
      const displayName = r.user?.name ?? r.name;
      const displayImage = r.user?.image ?? r.photo ?? null;
      const displayRole = r.user ? r.user.jobTitle : r.role;
      const displayCompany = r.user ? r.user.company : r.company;
      return {
        id: r.id,
        name: displayName,
        photo: displayImage,
        role: displayRole,
        company: displayCompany,
        platform: r.platform,
        rating: r.rating,
        review: r.review,
        createdAt: r.createdAt,
        featured: r.featured,
        userId: r.user?.id ?? null,
      };
    });

    return ok({
      reviews: pubReviews,
      total,
      hasMore: offset + reviews.length < total,
      averageRating: ratingAgg._avg.rating ? Math.round(ratingAgg._avg.rating * 10) / 10 : null,
      reviewCount: ratingAgg._count.rating,
    });
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

    const created = await prisma.review.create({
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

    return ok(created, 201);
  } catch (error) {
    console.error('Failed to create review:', error);
    return fail('Failed to submit review.', 500);
  }
}
