import { NextRequest, NextResponse } from 'next/server';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { deletePost, getPostRecord, POST_INCLUDE, replacePost, SocialPostError } from '@/lib/social/posts';
import { firstZodError, postInputSchema } from '@/lib/social/schemas';
import { serializePost } from '@/lib/social/serialize';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function failure(error: unknown) {
  if (error instanceof SocialPostError) return socialError(error.message, error.status);
  console.error('Social post API failed', error instanceof Error ? error.name : 'UnknownError');
  return socialError('The request could not be completed.', 500);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSocialApi(request, 'view');
  if (!auth.ok) return auth.response;

  const post = await getPostRecord(params.id);
  if (!post) return socialError('Post not found.', 404);
  return NextResponse.json(
    { ok: true, data: { post: serializePost(post) } },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSocialApi(request, 'edit');
  if (!auth.ok) return auth.response;

  const json = await request.json().catch(() => null);
  const parsed = postInputSchema.safeParse(json);
  if (!parsed.success) return socialError(firstZodError(parsed.error), 400);

  try {
    await replacePost(auth.actor, params.id, parsed.data);
    const post = await prisma.socialPost.findUnique({ where: { id: params.id }, include: POST_INCLUDE });
    if (!post) return socialError('Post not found.', 404);
    return NextResponse.json(
      { ok: true, data: { post: serializePost(post) } },
      { headers: SOCIAL_NO_STORE_HEADERS },
    );
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSocialApi(request, 'publish');
  if (!auth.ok) return auth.response;

  try {
    await deletePost(auth.actor, params.id);
    return NextResponse.json({ ok: true }, { headers: SOCIAL_NO_STORE_HEADERS });
  } catch (error) {
    return failure(error);
  }
}
