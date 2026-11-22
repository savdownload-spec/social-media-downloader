import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSocialApi, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSocialApi(request, 'view');
  if (!auth.ok) return auth.response;

  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [statusGroups, upcoming, attempts, accounts, publishedRecent, platformGroups] = await Promise.all([
    prisma.socialPost.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.socialPost.findMany({
      where: { status: { in: ['SCHEDULED', 'QUEUED'] }, scheduledAt: { gte: now } },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
      include: { variants: { select: { platform: true, status: true } } },
    }),
    prisma.publishingAttempt.findMany({
      orderBy: { startedAt: 'desc' },
      take: 8,
      include: {
        variant: { select: { platform: true, post: { select: { id: true, title: true, caption: true } } } },
        account: { select: { accountName: true } },
      },
    }),
    prisma.socialAccount.findMany({ select: { status: true } }),
    prisma.socialPost.count({ where: { publishedAt: { gte: since } } }),
    prisma.socialPostVariant.groupBy({ by: ['platform'], where: { status: 'PUBLISHED' }, _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = {};
  for (const group of statusGroups) counts[group.status] = group._count._all;

  return NextResponse.json(
    {
      ok: true,
      data: {
        counts,
        publishedRecent,
        accounts: {
          total: accounts.length,
          connected: accounts.filter((account) => account.status === 'CONNECTED' || account.status === 'EXPIRING').length,
        },
        upcoming: upcoming.map((post) => ({
          id: post.id,
          title: post.title,
          caption: post.caption,
          scheduledAt: post.scheduledAt?.toISOString() ?? null,
          status: post.status,
          platforms: post.variants.map((variant) => ({ platform: variant.platform, status: variant.status })),
        })),
        recentAttempts: attempts.map((attempt) => ({
          id: attempt.id,
          platform: attempt.platform,
          outcome: attempt.outcome,
          message: attempt.message,
          startedAt: attempt.startedAt.toISOString(),
          accountName: attempt.account?.accountName ?? null,
          post: attempt.variant?.post
            ? { id: attempt.variant.post.id, title: attempt.variant.post.title, caption: attempt.variant.post.caption }
            : null,
        })),
        publishedByPlatform: platformGroups.map((group) => ({ platform: group.platform, count: group._count._all })),
      },
    },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}
