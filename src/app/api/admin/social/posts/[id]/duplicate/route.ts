import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { duplicatePost, POST_INCLUDE, SocialPostError } from '@/lib/social/posts';
import { serializePost } from '@/lib/social/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSocialApi(request, 'create');
  if (!auth.ok) return auth.response;

  try {
    const newId = await duplicatePost(auth.actor, params.id);
    const post = await prisma.socialPost.findUnique({ where: { id: newId }, include: POST_INCLUDE });
    return NextResponse.json(
      { ok: true, data: { post: post ? serializePost(post) : null, id: newId } },
      { status: 201, headers: SOCIAL_NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof SocialPostError) return socialError(error.message, error.status);
    console.error('Social duplicate failed', error instanceof Error ? error.name : 'UnknownError');
    return socialError('The post could not be duplicated.', 500);
  }
}
