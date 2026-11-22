type DateLike = Date | string;

function iso(value: DateLike | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export type AssetInput = {
  id: string;
  url: string;
  pathname?: string | null;
  provider: string;
  kind: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  altText?: string | null;
  name: string;
  createdAt: DateLike;
};

export type VariantInputRecord = {
  id: string;
  platform: string;
  accountId?: string | null;
  status: string;
  caption: string;
  title?: string | null;
  hashtags?: string | null;
  linkUrl?: string | null;
  options?: unknown;
  remotePostId?: string | null;
  publishedUrl?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  attemptCount: number;
  lastAttemptAt?: DateLike | null;
  publishedAt?: DateLike | null;
};

export type PostInputRecord = {
  id: string;
  title?: string | null;
  caption: string;
  hashtags?: string | null;
  linkUrl?: string | null;
  status: string;
  scheduledAt?: DateLike | null;
  timezone: string;
  publishedAt?: DateLike | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: DateLike;
  updatedAt: DateLike;
  variants: VariantInputRecord[];
  media: Array<{ asset: AssetInput; position?: number }>;
  jobs?: Array<{ id: string; runAt: DateLike; status: string }>;
};

export function serializeAsset(asset: AssetInput) {
  return {
    id: asset.id,
    url: asset.url,
    pathname: asset.pathname ?? null,
    provider: asset.provider,
    kind: asset.kind,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    width: asset.width ?? null,
    height: asset.height ?? null,
    durationSeconds: asset.durationSeconds ?? null,
    altText: asset.altText ?? null,
    name: asset.name,
    createdAt: iso(asset.createdAt),
  };
}

export function serializeVariant(variant: VariantInputRecord) {
  return {
    id: variant.id,
    platform: variant.platform,
    accountId: variant.accountId ?? null,
    status: variant.status,
    caption: variant.caption,
    title: variant.title ?? null,
    hashtags: variant.hashtags ?? null,
    linkUrl: variant.linkUrl ?? null,
    options: (variant.options ?? {}) as Record<string, unknown>,
    remotePostId: variant.remotePostId ?? null,
    publishedUrl: variant.publishedUrl ?? null,
    errorCode: variant.errorCode ?? null,
    errorMessage: variant.errorMessage ?? null,
    attemptCount: variant.attemptCount,
    lastAttemptAt: iso(variant.lastAttemptAt),
    publishedAt: iso(variant.publishedAt),
  };
}

export function serializePost(post: PostInputRecord) {
  const variants = [...post.variants].sort((a, b) => a.platform.localeCompare(b.platform));
  return {
    id: post.id,
    title: post.title ?? null,
    caption: post.caption,
    hashtags: post.hashtags ?? null,
    linkUrl: post.linkUrl ?? null,
    status: post.status,
    scheduledAt: iso(post.scheduledAt),
    timezone: post.timezone,
    publishedAt: iso(post.publishedAt),
    createdBy: post.createdBy ?? null,
    updatedBy: post.updatedBy ?? null,
    createdAt: iso(post.createdAt),
    updatedAt: iso(post.updatedAt),
    media: post.media
      .map((entry, index) => ({ asset: serializeAsset(entry.asset), position: entry.position ?? index }))
      .sort((a, b) => a.position - b.position)
      .map((entry) => entry.asset),
    variants: variants.map(serializeVariant),
    jobs: (post.jobs ?? []).map((job) => ({
      id: job.id,
      runAt: iso(job.runAt),
      status: job.status,
    })),
  };
}

export type SerializedPost = ReturnType<typeof serializePost>;
export type SerializedAsset = ReturnType<typeof serializeAsset>;
