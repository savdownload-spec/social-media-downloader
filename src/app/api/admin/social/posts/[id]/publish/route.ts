import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { enqueuePostNow, POST_INCLUDE, SocialPostError } from '@/lib/social/posts';
import { serializePost } from '@/lib/social/serialize';
import { processJobNow } from '@/lib/social/worker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Publish now / retry. Re-queues every variant that is not already published
 * or cancelled, claims only this post's job, and returns the real outcome.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSocialApi(request, 'publish');
  if (!auth.ok) return auth.response;

  const existing = await prisma.socialPost.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!existing) return socialError('Post not found.', 404);

  try {
    await prisma.$transaction([
      prisma.socialPost.update({ where: { id: params.id }, data: { status: 'QUEUED', updatedBy: auth.actor.id } }),
      prisma.socialPostVariant.updateMany({
        where: { postId: params.id, status: { notIn: ['PUBLISHED', 'CANCELLED'] } },
        data: { status: 'QUEUED', errorCode: null, errorMessage: null },
      }),
    ]);

    const jobId = await enqueuePostNow(params.id);
    const run = await processJobNow(jobId);
    const post = await prisma.socialPost.findUnique({ where: { id: params.id }, include: POST_INCLUDE });
    if (!post) return socialError('Post not found after publishing.', 404);

    await writeAuditLog({
      adminId: auth.actor.id,
      adminEmail: auth.actor.email,
      action: 'social.post.publish_now',
      targetType: 'SocialPost',
      targetId: params.id,
      detail: { run: run?.postStatus ?? 'QUEUED' },
    });

    return NextResponse.json(
      { ok: true, data: { post: serializePost(post), run } },
      { headers: SOCIAL_NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof SocialPostError) return socialError(error.message, error.status);
    console.error('Social publish-now failed', error instanceof Error ? error.name : 'UnknownError');
    return socialError('Publishing could not be started.', 500);
  }
}
