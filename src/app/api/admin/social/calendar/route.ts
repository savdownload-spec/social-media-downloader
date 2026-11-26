import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseRange(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export async function GET(request: NextRequest) {
  const auth = await requireSocialApi(request, 'view');
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const now = new Date();
  const fallbackFrom = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
  const fallbackTo = new Date(now.getTime() + 62 * 24 * 60 * 60 * 1000);
  const from = parseRange(params.get('from'), fallbackFrom);
  const to = parseRange(params.get('to'), fallbackTo);
  if (to.getTime() <= from.getTime()) return socialError('Invalid calendar range.', 400);
  if (to.getTime() - from.getTime() > 400 * 24 * 60 * 60 * 1000) {
    return socialError('Calendar range is too wide.', 400);
  }

  const posts = await prisma.socialPost.findMany({
    where: {
      OR: [
        { scheduledAt: { gte: from, lte: to } },
        { publishedAt: { gte: from, lte: to } },
      ],
    },
    orderBy: { scheduledAt: 'asc' },
    take: 500,
    include: {
      variants: { select: { platform: true, status: true, publishedUrl: true } },
    },
  });

  return NextResponse.json(
    {
      ok: true,
      data: {
        from: from.toISOString(),
        to: to.toISOString(),
        posts: posts.map((post) => ({
          id: post.id,
          title: post.title,
          caption: post.caption,
          status: post.status,
          scheduledAt: post.scheduledAt?.toISOString() ?? null,
          publishedAt: post.publishedAt?.toISOString() ?? null,
          timezone: post.timezone,
          variants: post.variants,
        })),
      },
    },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}
