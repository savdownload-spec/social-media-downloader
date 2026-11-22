import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { IMAGE_MIME_TYPES, isBlobStorageConfigured, MAX_UPLOAD_BYTES, VIDEO_MIME_TYPES } from '@/lib/social/media';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Authorises a browser → Vercel Blob upload. Uploading directly from the
 * browser avoids the 4.5 MB serverless request-body limit, which matters for
 * video. The client registers metadata afterwards via POST /media.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSocialApi(request, 'media');
  if (!auth.ok) return auth.response;

  if (!isBlobStorageConfigured()) {
    return socialError('Blob storage is not configured for this deployment.', 503);
  }

  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return socialError('Invalid upload request.', 400);

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('social/')) {
          throw new Error('Upload path must start with social/.');
        }
        return {
          allowedContentTypes: [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ adminId: auth.actor.id }),
        };
      },
      onUploadCompleted: async () => {
        // Metadata is registered by the client through POST /media; the Blob
        // webhook cannot reach localhost and must not create rows implicitly.
      },
    });
    return NextResponse.json(jsonResponse, { headers: SOCIAL_NO_STORE_HEADERS });
  } catch (error) {
    return socialError(error instanceof Error ? error.message : 'Upload could not be authorised.', 400);
  }
}
