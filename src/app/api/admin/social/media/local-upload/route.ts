import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { MAX_UPLOAD_BYTES, mediaKindFromMime, safeFileName } from '@/lib/social/media';
import { serializeAsset } from '@/lib/social/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

/** Dev-only upload path used when no Vercel Blob token is configured. */
export async function POST(request: NextRequest) {
  const auth = await requireSocialApi(request, 'media');
  if (!auth.ok) return auth.response;

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return socialError('Direct filesystem uploads are disabled on deployed environments.', 403);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || !(file instanceof File)) return socialError('No file provided.', 400);
  if (file.size > MAX_UPLOAD_BYTES) return socialError('File exceeds the 200 MB limit.', 400);

  const kind = mediaKindFromMime(file.type);
  if (!kind) return socialError('Unsupported file type.', 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = EXTENSION[file.type] ?? 'bin';
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const fileName = `${crypto.randomUUID()}-${safeFileName(file.name.replace(/\.[^.]+$/, ''))}.${extension}`;
  const relativeDir = path.join('social', 'uploads', year, month);
  const absoluteDir = path.join(process.cwd(), 'public', ...relativeDir.split(path.sep));
  await mkdir(absoluteDir, { recursive: true });
  await writeFile(path.join(absoluteDir, fileName), buffer);

  let width: number | null = null;
  let height: number | null = null;
  if (kind === 'IMAGE') {
    const metadata = await sharp(buffer).metadata().catch(() => null);
    width = metadata?.width ?? null;
    height = metadata?.height ?? null;
  }

  const asset = await prisma.socialMediaAsset.create({
    data: {
      url: `/social/uploads/${year}/${month}/${fileName}`,
      pathname: `${relativeDir.split(path.sep).join('/')}/${fileName}`,
      provider: 'LOCAL',
      kind,
      mimeType: file.type,
      sizeBytes: file.size,
      width,
      height,
      name: file.name,
      createdBy: auth.actor.id,
    },
  });

  await writeAuditLog({
    adminId: auth.actor.id,
    adminEmail: auth.actor.email,
    action: 'social.media.upload',
    targetType: 'SocialMediaAsset',
    targetId: asset.id,
    detail: { provider: 'LOCAL', kind, sizeBytes: file.size },
  });

  return NextResponse.json(
    { ok: true, data: { asset: serializeAsset(asset) } },
    { status: 201, headers: SOCIAL_NO_STORE_HEADERS },
  );
}
