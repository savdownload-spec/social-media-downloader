import { NextResponse } from 'next/server';
import { handleUpload } from '@vercel/blob/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PDF_MAX_FILE_BYTES } from '@/lib/pdfConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Direct upload storage is not configured.' }, { status: 503 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in to upload files.' }, { status: 401 });
  try {
    const body = await req.json();
    const result = await handleUpload({
      token: process.env.BLOB_READ_WRITE_TOKEN,
      request: req,
      body,
      onBeforeGenerateToken: async (pathname, _clientPayload, multipart) => {
        if (!pathname.startsWith('pdf-jobs/')) throw new Error('Invalid upload path.');
        return {
          allowedContentTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
          maximumSizeInBytes: PDF_MAX_FILE_BYTES,
          validUntil: Date.now() + 15 * 60 * 1000,
          addRandomSuffix: true,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ userId: session.user.id, multipart }),
        };
      },
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Could not initialize secure file upload.' }, { status: 400 });
  }
}
