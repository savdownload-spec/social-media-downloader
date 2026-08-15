import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeAuditLog } from '@/lib/admin';
import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
}

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Local-filesystem image upload for blog content (dev/self-hosted Node
 * hosts). NOTE: this repo's Prisma schema explicitly documents that its
 * Vercel serverless target has no persistent filesystem, so files written
 * here will NOT survive across deploys/instances in that environment — a
 * real object-storage integration (out of scope for this change) is needed
 * for production persistence there. No cloud/paid storage SDK was added
 * per the "self-hosted only" instruction.
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

  const now = new Date();
  const dir = path.join(process.cwd(), 'public', 'images', 'blog', 'uploads', String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'));
  await mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.webp`;
  await writeFile(path.join(dir, filename), outBuffer);

  const url = `/images/blog/uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${filename}`;
  const outMeta = await sharp(outBuffer).metadata();

  await writeAuditLog({ adminId: admin.id!, adminEmail: admin.email!, action: 'content.media.upload', targetType: 'Media', targetId: url });

  return NextResponse.json({
    ok: true,
    data: { url, width: outMeta.width ?? null, height: outMeta.height ?? null, filename },
  });
}
