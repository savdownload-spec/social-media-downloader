import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { markVariantPublished, POST_INCLUDE, SocialPostError } from '@/lib/social/posts';
import { firstZodError, markPublishedSchema } from '@/lib/social/schemas';
import { serializePost } from '@/lib/social/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Confirms a manual publication with the real public URL. This is the only
 * path that marks a manual variant PUBLISHED — copy/export alone never does.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; variantId: string } },
) {
  const auth = await requireSocialApi(request, 'publish');
  if (!auth.ok) return auth.response;

  const json = await request.json().catch(() => null);
  const parsed = markPublishedSchema.safeParse(json);
  if (!parsed.success) return socialError(firstZodError(parsed.error), 400);

  try {
    await markVariantPublished(auth.actor, params.id, params.variantId, parsed.data.publishedUrl);
    const post = await prisma.socialPost.findUnique({ where: { id: params.id }, include: POST_INCLUDE });
    if (!post) return socialError('Post not found.', 404);
    return NextResponse.json(
      { ok: true, data: { post: serializePost(post) } },
      { headers: SOCIAL_NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof SocialPostError) return socialError(error.message, error.status);
    console.error('Manual confirmation failed', error instanceof Error ? error.name : 'UnknownError');
    return socialError('The confirmation could not be saved.', 500);
  }
}
