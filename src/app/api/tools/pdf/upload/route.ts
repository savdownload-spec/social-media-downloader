import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PDF_MAX_FILE_BYTES } from '@/lib/pdfConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Vercel private Blob stores can authenticate with OIDC via BLOB_STORE_ID;
  // local/non-Vercel environments need the explicit read-write token.
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID && !process.env.VERCEL) {
    return NextResponse.json({ error: 'Private Blob storage is not configured for this environment.' }, { status: 503 });
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in to upload files.' }, { status: 401 });
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 });
    if (file.size > PDF_MAX_FILE_BYTES) return NextResponse.json({ error: 'The file exceeds the 50 MB per-file limit.' }, { status: 413 });
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const extensionAllowed = /\.(pdf|jpe?g|png|webp|gif|docx?)$/i.test(file.name);
    if (!allowed.includes(file.type) && !extensionAllowed) return NextResponse.json({ error: 'Unsupported file type.' }, { status: 400 });
    const safeName = file.name.replace(/[/\\?%*:|"<>\u0000-\u001f]/g, '-').slice(0, 100) || 'document';
    const buffer = Buffer.from(await file.arrayBuffer());
    const blob = await put(`pdf-jobs/${Date.now()}-${safeName}`, buffer, {
      access: 'private',
      contentType: file.type || 'application/octet-stream',
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('PDF upload failed', error);
    return NextResponse.json({ error: 'Could not securely upload the file. Check the configured private Blob storage and try again.' }, { status: 502 });
  }
}
