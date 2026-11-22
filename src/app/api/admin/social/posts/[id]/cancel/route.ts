import { NextRequest, NextResponse } from 'next/server';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { cancelPost, SocialPostError } from '@/lib/social/posts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSocialApi(request, 'publish');
  if (!auth.ok) return auth.response;

  try {
    await cancelPost(auth.actor, params.id);
    return NextResponse.json({ ok: true }, { headers: SOCIAL_NO_STORE_HEADERS });
  } catch (error) {
    if (error instanceof SocialPostError) return socialError(error.message, error.status);
    console.error('Social cancel failed', error instanceof Error ? error.name : 'UnknownError');
    return socialError('The post could not be cancelled.', 500);
  }
}
