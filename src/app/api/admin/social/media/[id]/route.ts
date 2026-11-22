import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { firstZodError } from '@/lib/social/schemas';
import { isBlobStorageConfigured } from '@/lib/social/media';
import { serializeAsset } from '@/lib/social/serialize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  altText: z.string().max(1_000).nullish(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSocialApi(request, 'media');
  if (!auth.ok) return auth.response;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) return socialError(firstZodError(parsed.error), 400);

  const existing = await prisma.socialMediaAsset.findFirst({ where: { id: params.id, deletedAt: null } });
  if (!existing) return socialError('Asset not found.', 404);

  const asset = await prisma.socialMediaAsset.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.altText !== undefined ? { altText: parsed.data.altText } : {}),
    },
  });

  return NextResponse.json(
    { ok: true, data: { asset: serializeAsset(asset) } },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSocialApi(request, 'media');
  if (!auth.ok) return auth.response;

  const asset = await prisma.socialMediaAsset.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { _count: { select: { posts: true } } },
  });
  if (!asset) return socialError('Asset not found.', 404);
  if (asset._count.posts > 0) {
    return socialError(
      `This asset is used by ${asset._count.posts} post${asset._count.posts === 1 ? '' : 's'}. Remove it from those posts first.`,
      409,
    );
  }

  await prisma.socialMediaAsset.delete({ where: { id: asset.id } });
  if (asset.provider === 'BLOB' && isBlobStorageConfigured()) {
    await del(asset.url).catch(() => null);
  }

  await writeAuditLog({
    adminId: auth.actor.id,
    adminEmail: auth.actor.email,
    action: 'social.media.delete',
    targetType: 'SocialMediaAsset',
    targetId: asset.id,
    detail: { name: asset.name, provider: asset.provider },
  });

  return NextResponse.json({ ok: true }, { headers: SOCIAL_NO_STORE_HEADERS });
}
