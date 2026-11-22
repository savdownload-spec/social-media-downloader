import type { SocialAccount, SocialMediaAsset, SocialPost, SocialPostVariant } from '@prisma/client';
import type { PlatformId } from '../platforms';

export type PublishAsset = Pick<SocialMediaAsset, 'id' | 'url' | 'kind' | 'mimeType' | 'altText'>;

export type PublishContext = {
  post: SocialPost;
  variant: SocialPostVariant;
  account: SocialAccount | null;
  assets: PublishAsset[];
};

export type PublishOutcome =
  | { outcome: 'PUBLISHED'; remotePostId?: string; publishedUrl?: string; providerResponse?: unknown }
  | { outcome: 'MANUAL' | 'NEEDS_AUTH' | 'FAILED'; code?: string; message: string; providerResponse?: unknown };

export type PlatformAdapter = (context: PublishContext) => Promise<PublishOutcome>;

/**
 * Real integrations register here in Phase 2 (Meta, LinkedIn, Bluesky,
 * Mastodon). An absent adapter is handled honestly by the worker: manual
 * platforms become MANUAL_ACTION_REQUIRED, automation targets become
 * NEEDS_AUTHORIZATION — never a fabricated success.
 */
export const adapters: Partial<Record<PlatformId, PlatformAdapter>> = {};

export function hasAdapter(platform: string): boolean {
  return Boolean(adapters[platform as PlatformId]);
}
