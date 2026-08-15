import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeAuditLog } from '@/lib/admin';
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Uploads a processed image and returns its public URL.
 *
 * Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is configured (required in
 * production — Vercel serverless functions have no persistent filesystem,
 * per the note in prisma/schema.prisma). Falls back to writing under
 * public/images/blog/uploads/ for local/self-hosted dev where no Blob
 * token is set, so `npm run dev` keeps working with zero setup.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string; email?: string };
  if (admin?.role !== 'ADMIN') return forbidden();

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'No file provided' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ ok: false, error: 'Unsupported file type' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'File too large (max 8MB)' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const image = sharp(buffer).rotate();
  const metadata = await image.metadata();

  const resized = metadata.width && metadata.width > 2000 ? image.resize({ width: 2000 }) : image;
  const outBuffer = await resized.webp({ quality: 82 }).toBuffer();
  const outMeta = await sharp(outBuffer).metadata();

  const now = new Date();
  const filename = `${crypto.randomUUID()}.webp`;
  const relativePath = `blog/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${filename}`;

  // Vercel sets this on every deployment (not just production), so it's a
  // reliable "are we running on serverless with no writable filesystem?"
  // check — used to fail fast with a clear message instead of an ENOENT
  // crash from trying to mkdir under the read-only /var/task.
  const onVercel = !!process.env.VERCEL;

  let url: string;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(relativePath, outBuffer, {
      access: 'public',
      contentType: 'image/webp',
      addRandomSuffix: false,
    });
    url = blob.url;
  } else if (onVercel) {
    return NextResponse.json(
      { ok: false, error: 'Image storage is not configured for this deployment. Add BLOB_READ_WRITE_TOKEN to this project\'s Production environment variables (Vercel → Storage → your Blob store → connect it to Production), then redeploy.' },
      { status: 500 },
    );
  } else {
    const dir = path.join(process.cwd(), 'public', 'images', 'blog', 'uploads', String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), outBuffer);
    url = `/images/blog/uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${filename}`;
  }

  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'content.media.upload', targetType: 'Media', targetId: url });

  return NextResponse.json({
    ok: true,
    data: { url, width: outMeta.width ?? null, height: outMeta.height ?? null, filename },
  });
}
