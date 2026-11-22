import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { isLocalSocialUrl, isVercelBlobUrl, MAX_UPLOAD_BYTES, mediaKindFromMime } from '@/lib/social/media';
import { firstZodError, mediaRegisterSchema } from '@/lib/social/schemas';
import { serializeAsset } from '@/lib/social/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSocialApi(request, 'view');
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const kind = params.get('kind') ?? '';
  const search = params.get('search')?.trim() ?? '';
  const ids = (params.get('ids') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  const pageSize = ids.length > 0
    ? 60
    : Math.min(60, Math.max(1, Number.parseInt(params.get('pageSize') ?? '24', 10) || 24));

  const where = {
    deletedAt: null,
    ...(ids.length > 0 ? { id: { in: ids.slice(0, 60) } } : {}),
    ...(kind === 'IMAGE' || kind === 'VIDEO' ? { kind } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { altText: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [assets, total] = await Promise.all([
    prisma.socialMediaAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { posts: true } } },
    }),
    prisma.socialMediaAsset.count({ where }),
  ]);

  return NextResponse.json(
    {
      ok: true,
      data: {
        assets: assets.map((asset) => ({ ...serializeAsset(asset), usageCount: asset._count.posts })),
        total,
        page,
        pageSize,
      },
    },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}

/**
 * Registers an asset after a browser → Blob upload (or a local dev upload of a
 * blob-sized file). Only URLs under our own storage are accepted.
 */
export async function POST(request: NextRequest) {
  const auth = await requireSocialApi(request, 'media');
  if (!auth.ok) return auth.response;

  const json = await request.json().catch(() => null);
  const parsed = mediaRegisterSchema.safeParse(json);
  if (!parsed.success) return socialError(firstZodError(parsed.error), 400);
  const data = parsed.data;

  if (data.sizeBytes > MAX_UPLOAD_BYTES) return socialError('File exceeds the 200 MB limit.', 400);
  const kind = mediaKindFromMime(data.mimeType);
  if (!kind || kind !== data.kind) return socialError('Unsupported file type.', 400);

  if (data.provider === 'BLOB') {
    if (!isVercelBlobUrl(data.url) || !(data.pathname ?? '').startsWith('social/')) {
      return socialError('Blob assets must live under the social/ prefix of this project’s Blob store.', 400);
    }
  } else if (!isLocalSocialUrl(data.url)) {
    return socialError('Local assets must live under /social/uploads/.', 400);
  }

  const asset = await prisma.socialMediaAsset.create({
    data: {
      url: data.url,
      pathname: data.pathname ?? null,
      provider: data.provider,
      kind: data.kind,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      width: data.width ?? null,
      height: data.height ?? null,
      durationSeconds: data.durationSeconds ?? null,
      altText: data.altText ?? null,
      name: data.name,
      createdBy: auth.actor.id,
    },
  });

  await writeAuditLog({
    adminId: auth.actor.id,
    adminEmail: auth.actor.email,
    action: 'social.media.upload',
    targetType: 'SocialMediaAsset',
    targetId: asset.id,
    detail: { provider: asset.provider, kind: asset.kind, sizeBytes: asset.sizeBytes },
  });

  return NextResponse.json(
    { ok: true, data: { asset: serializeAsset(asset) } },
    { status: 201, headers: SOCIAL_NO_STORE_HEADERS },
  );
}
