import { NextRequest, NextResponse } from 'next/server';
import { requireSocialApi, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { IMAGE_MIME_TYPES, isBlobStorageConfigured, MAX_UPLOAD_BYTES, VIDEO_MIME_TYPES } from '@/lib/social/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSocialApi(request, 'view');
  if (!auth.ok) return auth.response;

  const mode = isBlobStorageConfigured()
    ? 'blob'
    : process.env.VERCEL
      ? 'unavailable'
      : 'local';

  return NextResponse.json(
    {
      ok: true,
      data: {
        mode,
        maxBytes: MAX_UPLOAD_BYTES,
        imageTypes: IMAGE_MIME_TYPES,
        videoTypes: VIDEO_MIME_TYPES,
      },
    },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}
