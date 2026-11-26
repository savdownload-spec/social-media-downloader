import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { ATTENTION_STATUSES } from '@/lib/social/status';
import { createPost, enqueuePostNow, POST_INCLUDE, SocialPostError } from '@/lib/social/posts';
import { firstZodError, postInputSchema } from '@/lib/social/schemas';
import { serializePost } from '@/lib/social/serialize';
import { processJobNow } from '@/lib/social/worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TAB_STATUSES: Record<string, string[]> = {
  scheduled: ['SCHEDULED', 'QUEUED', 'PUBLISHING'],
  published: ['PUBLISHED', 'PARTIAL'],
  drafts: ['DRAFT'],
  failed: ['FAILED'],
  attention: [...ATTENTION_STATUSES],
};

function socialPostErrorResponse(error: unknown) {
  if (error instanceof SocialPostError) return socialError(error.message, error.status);
  console.error('Social posts API failed', error instanceof Error ? error.name : 'UnknownError');
  return socialError('The request could not be completed.', 500);
}

export async function GET(request: NextRequest) {
  const auth = await requireSocialApi(request, 'view');
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(params.get('pageSize') ?? '20', 10) || 20));
  const tab = params.get('tab') ?? '';
  const statusParam = params.get('status') ?? '';
  const platform = params.get('platform') ?? '';
  const search = params.get('search')?.trim() ?? '';

  const searchWhere = {
    ...(platform ? { variants: { some: { platform } } } : {}),
    ...(search
      ? {
          OR: [
            { caption: { contains: search, mode: 'insensitive' as const } },
            { title: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const statuses = statusParam
    ? statusParam.split(',').filter(Boolean)
    : tab
      ? TAB_STATUSES[tab]
      : undefined;

  if (tab && !TAB_STATUSES[tab] && !statusParam) {
    return socialError('Unknown tab.', 400);
  }

  const where = { ...searchWhere, ...(statuses ? { status: { in: statuses } } : {}) };

  const [posts, total, grouped] = await Promise.all([
    prisma.socialPost.findMany({
      where,
      include: POST_INCLUDE,
      orderBy: [{ scheduledAt: 'desc' }, { updatedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.socialPost.count({ where }),
    prisma.socialPost.groupBy({ by: ['status'], where: searchWhere, _count: { _all: true } }),
  ]);

  const counts: Record<string, number> = {};
  for (const group of grouped) counts[group.status] = group._count._all;

  return NextResponse.json(
    {
      ok: true,
      data: {
        posts: posts.map(serializePost),
        total,
        page,
        pageSize,
        counts,
      },
    },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireSocialApi(request, 'create');
  if (!auth.ok) return auth.response;

  const json = await request.json().catch(() => null);
  const parsed = postInputSchema.safeParse(json);
  if (!parsed.success) return socialError(firstZodError(parsed.error), 400);

  try {
    const postId = await createPost(auth.actor, parsed.data);
    let run = null;
    if (parsed.data.mode === 'publish') {
      const jobId = await enqueuePostNow(postId);
      run = await processJobNow(jobId);
    }
    const post = await prisma.socialPost.findUnique({ where: { id: postId }, include: POST_INCLUDE });
    if (!post) return socialError('Post was created but could not be reloaded.', 500);
    return NextResponse.json(
      { ok: true, data: { post: serializePost(post), run } },
      { status: 201, headers: SOCIAL_NO_STORE_HEADERS },
    );
  } catch (error) {
    return socialPostErrorResponse(error);
  }
}
