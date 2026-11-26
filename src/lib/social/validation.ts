import { getPlatform, type PlatformId } from './platforms';

export type AssetSummary = {
  id?: string;
  kind: 'IMAGE' | 'VIDEO';
  mimeType: string;
  width?: number | null;
  height?: number | null;
  sizeBytes: number;
};

export type VariantDraft = {
  platform: PlatformId;
  caption?: string | null;
  title?: string | null;
  hashtags?: string | null;
  linkUrl?: string | null;
  options?: Record<string, unknown> | null;
};

export type PostDraft = {
  caption: string;
  title?: string | null;
  hashtags?: string | null;
  linkUrl?: string | null;
  media: AssetSummary[];
};

export type VariantContext = {
  accountConnected: boolean;
  optionValues?: {
    board?: string | null;
    visibility?: string | null;
  };
};

export type ValidationIssue = {
  level: 'error' | 'warning';
  message: string;
};

export type VariantValidation = {
  platform: PlatformId;
  issues: ValidationIssue[];
  blocking: boolean;
};

const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

export function composeFullText(caption: string, hashtags?: string | null, linkUrl?: string | null): string {
  const parts = [caption.trim()];
  const tags = (hashtags ?? '').trim();
  if (tags) parts.push(tags);
  const link = (linkUrl ?? '').trim();
  if (link) parts.push(link);
  return parts.filter(Boolean).join('\n\n');
}

/**
 * Character count used for limits. Kept as a function per platform because
 * providers count URLs differently; none of the connected platforms rewrap
 * links yet, so this is the raw length.
 */
export function effectiveLength(_platform: PlatformId, text: string, _linkUrl?: string | null): number {
  return text.length;
}

export function resolveVariantContent(post: PostDraft, variant: VariantDraft) {
  const caption = (variant.caption ?? '').trim() || post.caption || '';
  const hashtags = variant.hashtags ?? post.hashtags ?? '';
  const linkUrl = variant.linkUrl ?? post.linkUrl ?? '';
  const title = (variant.title ?? post.title ?? '').trim();
  return { caption, hashtags, linkUrl, title };
}

export function validateVariant(
  post: PostDraft,
  variant: VariantDraft,
  context: VariantContext,
): VariantValidation {
  const def = getPlatform(variant.platform);
  const issues: ValidationIssue[] = [];
  if (!def) {
    return {
      platform: variant.platform,
      issues: [{ level: 'error', message: 'Unknown platform.' }],
      blocking: true,
    };
  }

  const { caption, hashtags, linkUrl, title } = resolveVariantContent(post, variant);
  const text = composeFullText(caption, hashtags, linkUrl);

  if (!caption.trim() && def.media.requiresMedia) {
    issues.push({ level: 'warning', message: 'Caption is empty; the platform will show the media only.' });
  }
  if (!caption.trim() && !def.media.requiresMedia) {
    issues.push({ level: 'error', message: 'Add a caption — this platform does not accept an empty post.' });
  }

  if (def.captionLimit && effectiveLength(variant.platform, text, linkUrl) > def.captionLimit) {
    issues.push({
      level: 'error',
      message: `Text is ${effectiveLength(variant.platform, text, linkUrl)} characters; ${def.captionLimit} allowed.`,
    });
  }

  if (def.titleRequired && !title) {
    issues.push({ level: 'error', message: 'A title is required on this platform.' });
  }
  if (def.titleLimit && title.length > def.titleLimit) {
    issues.push({ level: 'error', message: `Title is ${title.length} characters; ${def.titleLimit} allowed.` });
  }

  if (linkUrl && !URL_PATTERN.test(linkUrl)) {
    issues.push({ level: 'error', message: 'The destination link must start with http:// or https://.' });
  }

  const images = post.media.filter((asset) => asset.kind === 'IMAGE');
  const videos = post.media.filter((asset) => asset.kind === 'VIDEO');

  if (def.media.requiresMedia && images.length === 0 && videos.length === 0) {
    issues.push({ level: 'error', message: 'This platform requires at least one image or video.' });
  }

  if (images.length > def.media.images.max) {
    if (def.media.images.max === 0) {
      issues.push({ level: 'warning', message: 'Images are not copied by the manual workflow for this platform.' });
    } else {
      issues.push({
        level: 'error',
        message: `Up to ${def.media.images.max} image${def.media.images.max === 1 ? '' : 's'} allowed; ${images.length} attached.`,
      });
    }
  }

  for (const image of images) {
    if (def.media.images.max > 0 && !def.media.images.mimeTypes.includes(image.mimeType)) {
      issues.push({
        level: 'error',
        message: `${def.short} does not accept ${image.mimeType}. Use ${
          def.media.images.mimeTypes.some((m) => m.includes('jpeg')) ? 'JPEG' : 'a supported image format'
        }.`,
      });
    }
  }

  if (videos.length > 0) {
    if (!def.media.video || def.media.video.max === 0) {
      issues.push({ level: 'warning', message: 'Video is not copied by the manual workflow for this platform.' });
    } else {
      if (videos.length > def.media.video.max) {
        issues.push({ level: 'error', message: `Only ${def.media.video.max} video allowed.` });
      }
      for (const video of videos) {
        if (!def.media.video.mimeTypes.includes(video.mimeType)) {
          issues.push({ level: 'error', message: `${def.short} does not accept ${video.mimeType}.` });
        }
        if (video.sizeBytes > def.media.video.maxBytes) {
          issues.push({ level: 'error', message: 'Video exceeds the size limit for this platform.' });
        }
      }
    }
  }

  if (variant.platform === 'INSTAGRAM') {
    for (const asset of [...images, ...videos]) {
      if (!asset.width || !asset.height) continue;
      const ratio = asset.width / asset.height;
      if (ratio < 0.8 || ratio > 1.91) {
        issues.push({
          level: 'warning',
          message: 'Instagram crops media outside a 4:5 to 1.91:1 aspect ratio.',
        });
        break;
      }
    }
  }

  const optionValues = context.optionValues ?? {};
  if (def.accountOptions?.includes('board') && !optionValues.board) {
    issues.push({
      level: context.accountConnected ? 'error' : 'warning',
      message: context.accountConnected
        ? 'Choose a Pinterest board.'
        : 'A Pinterest board is required at publish time; manual export is available now.',
    });
  }
  if (def.autoPublish && def.automatedPhase !== null && !context.accountConnected) {
    issues.push({
      level: 'warning',
      message: `No ${def.short} account connected — this variant will need authorization before it can publish.`,
    });
  }
  if (!def.autoPublish) {
    issues.push({ level: 'warning', message: 'Manual publishing only — copy or export the content.' });
  }

  const tagCount = (hashtags.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;
  if (tagCount > 30) {
    issues.push({ level: 'warning', message: 'More than 30 hashtags may look spammy.' });
  }

  return {
    platform: variant.platform,
    issues,
    blocking: issues.some((issue) => issue.level === 'error'),
  };
}

export function validatePostForSubmission(
  post: PostDraft,
  variants: VariantDraft[],
  contexts: Partial<Record<PlatformId, VariantContext>>,
): { results: VariantValidation[]; blocking: boolean } {
  const results = variants.map((variant) =>
    validateVariant(post, variant, contexts[variant.platform] ?? { accountConnected: false }),
  );
  return { results, blocking: results.some((result) => result.blocking) };
}
