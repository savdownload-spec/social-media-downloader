import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import { getPlatform, isPlatformId, type PlatformId } from './platforms';
import { canQueuePublish } from './permissions';
import type { SocialActor } from './api-auth';
import { getSocialConfig } from './settings';
import { validatePostForSubmission, type AssetSummary, type VariantContext, type VariantDraft } from './validation';
import type { PostInput } from './schemas';
import { cancelQueuedJobs } from './queue';
import { derivePostStatus } from './status';

export class SocialPostError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'SocialPostError';
    this.status = status;
  }
}

type AccountPicker = Map<string, string>;

async function connectedAccountIds(platforms: string[]): Promise<AccountPicker> {
  const accounts = await prisma.socialAccount.findMany({
    where: { platform: { in: platforms }, status: { in: ['CONNECTED', 'EXPIRING'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, platform: true },
  });
  const map: AccountPicker = new Map();
  for (const account of accounts) {
    if (!map.has(account.platform)) map.set(account.platform, account.id);
  }
  return map;
}

async function loadAssets(mediaIds: string[]) {
  if (mediaIds.length === 0) return [];
  const assets = await prisma.socialMediaAsset.findMany({
    where: { id: { in: mediaIds }, deletedAt: null },
  });
  if (assets.length !== mediaIds.length) {
    throw new SocialPostError('One or more media items are missing or deleted.', 400);
  }
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  return mediaIds.map((id) => byId.get(id)!);
}

function assetSummaries(assets: Awaited<ReturnType<typeof loadAssets>>): AssetSummary[] {
  return assets.map((asset) => ({
    id: asset.id,
    kind: asset.kind === 'VIDEO' ? 'VIDEO' : 'IMAGE',
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    sizeBytes: asset.sizeBytes,
  }));
}

function dedupeVariants(input: PostInput) {
  const seen = new Set<string>();
  for (const variant of input.variants) {
    if (!isPlatformId(variant.platform)) throw new SocialPostError(`Unsupported platform: ${variant.platform}`, 400);
    if (seen.has(variant.platform)) {
      throw new SocialPostError(`Each platform can only be selected once per post (${variant.platform}).`, 400);
    }
    seen.add(variant.platform);
  }
}

function variantDrafts(input: PostInput): VariantDraft[] {
  return input.variants.map((variant) => ({
    platform: variant.platform,
    caption: variant.caption,
    title: variant.title,
    hashtags: variant.hashtags,
    linkUrl: variant.linkUrl,
    options: (variant.options ?? {}) as Record<string, unknown>,
  }));
}

async function buildContexts(
  input: PostInput,
  accountMap: AccountPicker,
): Promise<Partial<Record<PlatformId, VariantContext>>> {
  const contexts: Partial<Record<PlatformId, VariantContext>> = {};
  for (const variant of input.variants) {
    const options = (variant.options ?? {}) as Record<string, unknown>;
    contexts[variant.platform] = {
      accountConnected: accountMap.has(variant.platform),
      optionValues: {
        board: typeof options.board === 'string' ? options.board : null,
        visibility: typeof options.visibility === 'string' ? options.visibility : null,
      },
    };
  }
  return contexts;
}

function assertValidForPublish(input: PostInput, contexts: Partial<Record<PlatformId, VariantContext>>, assets: AssetSummary[]) {
  const result = validatePostForSubmission(
    {
      caption: input.caption,
      title: input.title,
      hashtags: input.hashtags,
      linkUrl: input.linkUrl,
      media: assets,
    },
    variantDrafts(input),
    contexts,
  );
  const errors = result.results.flatMap((entry) =>
    entry.issues.filter((issue) => issue.level === 'error').map((issue) => `${entry.platform}: ${issue.message}`),
  );
  if (errors.length > 0) {
    throw new SocialPostError(`Fix before continuing — ${errors[0]}`, 400);
  }
}

function parseScheduledAt(input: PostInput): Date | null {
  if (input.mode !== 'schedule') return null;
  if (!input.scheduledAt) throw new SocialPostError('Choose a date and time before scheduling.', 400);
  const date = new Date(input.scheduledAt);
  if (Number.isNaN(date.getTime())) throw new SocialPostError('Invalid schedule date.', 400);
  return date;
}

/** Resolve the post/variant status for a create or rewrite. */
export function resolveSubmissionState(actor: SocialActor, input: PostInput, scheduledAt: Date | null) {
  if (input.mode === 'draft') {
    return { postStatus: 'DRAFT', variantStatus: 'DRAFT', shouldQueue: false };
  }
  if (input.mode === 'schedule') {
    if (!canQueuePublish(actor.role)) {
      // Editors propose a time; a publisher approves it.
      return { postStatus: 'DRAFT', variantStatus: 'DRAFT', shouldQueue: false };
    }
    if (!scheduledAt) throw new SocialPostError('Choose a date and time before scheduling.', 400);
    return { postStatus: 'SCHEDULED', variantStatus: 'SCHEDULED', shouldQueue: true };
  }
  if (!canQueuePublish(actor.role)) {
    throw new SocialPostError('Your role can prepare drafts but cannot publish. Ask a publisher to approve it.', 403);
  }
  return { postStatus: 'QUEUED', variantStatus: 'QUEUED', shouldQueue: false };
}

export async function createPost(actor: SocialActor, input: PostInput) {
  const config = await getSocialConfig();
  const timezone = input.timezone || config.timezone;
  dedupeVariants(input);
  const scheduledAt = parseScheduledAt(input);
  const assets = await loadAssets(input.mediaIds);
  const accountMap = await connectedAccountIds(input.variants.map((variant) => variant.platform));
  const contexts = await buildContexts(input, accountMap);

  if (input.mode !== 'draft') {
    assertValidForPublish(input, contexts, assetSummaries(assets));
  }

  const { postStatus, variantStatus, shouldQueue } = resolveSubmissionState(actor, input, scheduledAt);
  const platformIds = input.variants.map((variant) => variant.platform);
  const uniquePlatforms = [...new Set(platformIds)];

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.socialPost.create({
      data: {
        title: input.title?.trim() || null,
        caption: input.caption,
        hashtags: input.hashtags?.trim() || null,
        linkUrl: input.linkUrl?.trim() || null,
        status: postStatus,
        scheduledAt,
        timezone,
        createdBy: actor.id,
        updatedBy: actor.id,
        variants: {
          create: input.variants.map((variant) => ({
            platform: variant.platform,
            accountId: accountMap.get(variant.platform) ?? null,
            caption: variant.caption ?? '',
            title: variant.title ?? null,
            hashtags: variant.hashtags ?? null,
            linkUrl: variant.linkUrl ?? null,
            options: (variant.options ?? undefined) as Prisma.InputJsonValue | undefined,
            status: variantStatus,
          })),
        },
        media: {
          create: assets.map((asset, index) => ({ assetId: asset.id, position: index })),
        },
      },
    });

    if (shouldQueue && scheduledAt) {
      await tx.publishingJob.create({
        data: { postId: created.id, runAt: scheduledAt, status: 'QUEUED' },
      });
    }
    return created;
  });

  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: input.mode === 'schedule' ? 'social.post.schedule' : input.mode === 'publish' ? 'social.post.publish' : 'social.post.create',
    targetType: 'SocialPost',
    targetId: post.id,
    detail: { platforms: uniquePlatforms, mode: input.mode, status: postStatus },
  });

  return post.id;
}

/** Rewrite an existing post. Only unsettled drafts/schedules may be replaced. */
export async function replacePost(actor: SocialActor, postId: string, input: PostInput) {
  const existing = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: { variants: true },
  });
  if (!existing) throw new SocialPostError('Post not found.', 404);
  if (!['DRAFT', 'SCHEDULED', 'CANCELLED'].includes(existing.status)) {
    throw new SocialPostError('This post has already been published or attempted; duplicate it to make changes.', 409);
  }
  if (existing.variants.some((variant) => variant.status === 'PUBLISHED')) {
    throw new SocialPostError('A published variant cannot be rewritten. Duplicate the post instead.', 409);
  }

  const config = await getSocialConfig();
  const timezone = input.timezone || config.timezone;
  dedupeVariants(input);
  const scheduledAt = parseScheduledAt(input);
  const assets = await loadAssets(input.mediaIds);
  const accountMap = await connectedAccountIds(input.variants.map((variant) => variant.platform));
  const contexts = await buildContexts(input, accountMap);
  if (input.mode !== 'draft') assertValidForPublish(input, contexts, assetSummaries(assets));

  const { postStatus, variantStatus, shouldQueue } = resolveSubmissionState(actor, input, scheduledAt);

  await cancelQueuedJobs(postId);

  await prisma.$transaction(async (tx) => {
    await tx.publishingJob.deleteMany({ where: { postId } });
    await tx.socialPostVariant.deleteMany({ where: { postId } });
    await tx.socialPostMedia.deleteMany({ where: { postId } });
    await tx.socialPost.update({
      where: { id: postId },
      data: {
        title: input.title?.trim() || null,
        caption: input.caption,
        hashtags: input.hashtags?.trim() || null,
        linkUrl: input.linkUrl?.trim() || null,
        status: postStatus,
        scheduledAt,
        timezone,
        updatedBy: actor.id,
        publishedAt: null,
        variants: {
          create: input.variants.map((variant) => ({
            platform: variant.platform,
            accountId: accountMap.get(variant.platform) ?? null,
            caption: variant.caption ?? '',
            title: variant.title ?? null,
            hashtags: variant.hashtags ?? null,
            linkUrl: variant.linkUrl ?? null,
            options: (variant.options ?? undefined) as Prisma.InputJsonValue | undefined,
            status: variantStatus,
          })),
        },
        media: { create: assets.map((asset, index) => ({ assetId: asset.id, position: index })) },
      },
    });
    if (shouldQueue && scheduledAt) {
      await tx.publishingJob.create({ data: { postId, runAt: scheduledAt, status: 'QUEUED' } });
    }
  });

  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'social.post.update',
    targetType: 'SocialPost',
    targetId: postId,
    detail: { mode: input.mode, status: postStatus },
  });
}

export async function duplicatePost(actor: SocialActor, postId: string) {
  const source = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: { variants: true, media: true },
  });
  if (!source) throw new SocialPostError('Post not found.', 404);

  const copy = await prisma.socialPost.create({
    data: {
      title: source.title ? `Copy of ${source.title}` : 'Copy of post',
      caption: source.caption,
      hashtags: source.hashtags,
      linkUrl: source.linkUrl,
      status: 'DRAFT',
      scheduledAt: null,
      timezone: source.timezone,
      createdBy: actor.id,
      updatedBy: actor.id,
      variants: {
        create: source.variants.map((variant) => ({
          platform: variant.platform,
          accountId: variant.accountId,
          caption: variant.caption,
          title: variant.title,
          hashtags: variant.hashtags,
          linkUrl: variant.linkUrl,
          options: (variant.options ?? undefined) as Prisma.InputJsonValue | undefined,
          status: 'DRAFT',
        })),
      },
      media: { create: source.media.map((entry) => ({ assetId: entry.assetId, position: entry.position })) },
    },
  });

  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'social.post.duplicate',
    targetType: 'SocialPost',
    targetId: copy.id,
    detail: { sourceId: postId },
  });

  return copy.id;
}

export async function cancelPost(actor: SocialActor, postId: string) {
  const post = await prisma.socialPost.findUnique({ where: { id: postId }, select: { status: true } });
  if (!post) throw new SocialPostError('Post not found.', 404);
  if (!['SCHEDULED', 'QUEUED', 'DRAFT'].includes(post.status)) {
    throw new SocialPostError('Only scheduled or queued posts can be cancelled.', 409);
  }
  await cancelQueuedJobs(postId);
  await prisma.socialPostVariant.updateMany({
    where: { postId, status: { in: ['DRAFT', 'SCHEDULED', 'QUEUED'] } },
    data: { status: 'CANCELLED' },
  });
  await prisma.socialPost.update({ where: { id: postId }, data: { status: 'CANCELLED', updatedBy: actor.id } });
  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'social.post.cancel',
    targetType: 'SocialPost',
    targetId: postId,
  });
}

/** Delete is limited to posts that never reached a provider. */
export async function deletePost(actor: SocialActor, postId: string) {
  const post = await prisma.socialPost.findUnique({ where: { id: postId }, select: { status: true } });
  if (!post) throw new SocialPostError('Post not found.', 404);
  if (!['DRAFT', 'SCHEDULED', 'CANCELLED'].includes(post.status)) {
    throw new SocialPostError('Published or attempted posts are kept for the audit trail.', 409);
  }
  await prisma.socialPost.delete({ where: { id: postId } });
  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'social.post.delete',
    targetType: 'SocialPost',
    targetId: postId,
  });
}

export async function markVariantPublished(
  actor: SocialActor,
  postId: string,
  variantId: string,
  publishedUrl: string,
) {
  const variant = await prisma.socialPostVariant.findFirst({
    where: { id: variantId, postId },
    select: { id: true, platform: true },
  });
  if (!variant) throw new SocialPostError('Variant not found.', 404);

  await prisma.socialPostVariant.update({
    where: { id: variantId },
    data: {
      status: 'PUBLISHED',
      publishedUrl,
      publishedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    },
  });

  const variants = await prisma.socialPostVariant.findMany({
    where: { postId },
    select: { status: true },
  });
  const postStatus = derivePostStatus(variants.map((entry) => entry.status));
  await prisma.socialPost.update({
    where: { id: postId },
    data: {
      status: postStatus,
      updatedBy: actor.id,
      publishedAt: variants.some((entry) => entry.status === 'PUBLISHED') ? new Date() : null,
    },
  });

  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'social.post.manual_confirm',
    targetType: 'SocialPost',
    targetId: postId,
    detail: { platform: variant.platform, publishedUrl },
  });

  return postStatus;
}

export function platformName(platform: string): string {
  return getPlatform(platform)?.short ?? platform;
}

/** Shared include so every response has the same shape. */
export const POST_INCLUDE = {
  variants: true,
  media: { include: { asset: true }, orderBy: { position: 'asc' as const } },
  jobs: { orderBy: { createdAt: 'desc' as const }, take: 5 },
} as const;

export async function getPostRecord(postId: string) {
  return prisma.socialPost.findUnique({ where: { id: postId }, include: POST_INCLUDE });
}

/** Queue a post for immediate processing and return the job id. */
export async function enqueuePostNow(postId: string): Promise<string> {
  await cancelQueuedJobs(postId);
  const job = await prisma.publishingJob.create({
    data: { postId, runAt: new Date(), status: 'QUEUED' },
    select: { id: true },
  });
  return job.id;
}
