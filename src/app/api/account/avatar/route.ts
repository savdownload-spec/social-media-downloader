import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Uploads a user's avatar. Same guarded storage pattern as
 * src/app/api/admin/content/media/route.ts — Vercel Blob when configured
 * (required in production; serverless has no persistent filesystem), else
 * a local public/ path for dev.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: false, error: 'Please log in.' }, { status: 401 });

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
  let outBuffer: Buffer;
  try {
    outBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 256, height: 256, fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json({ ok: false, error: 'That file doesn\'t look like a valid image.' }, { status: 400 });
  }

  const filename = `${userId}-${crypto.randomUUID()}.webp`;
  const relativePath = `avatars/${filename}`;
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
      { ok: false, error: 'Image storage is not configured for this deployment. Add BLOB_READ_WRITE_TOKEN to this project\'s Production environment variables, then redeploy.' },
      { status: 500 },
    );
  } else {
    const dir = path.join(process.cwd(), 'public', 'images', 'avatars');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), outBuffer);
    url = `/images/avatars/${filename}`;
  }

  await prisma.user.update({ where: { id: userId }, data: { image: url } });

  return NextResponse.json({ ok: true, data: { url } });
}
