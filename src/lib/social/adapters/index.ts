import type { SocialAccount, SocialMediaAsset, SocialPost, SocialPostVariant } from '@prisma/client';
import type { PlatformId } from '../platforms';
import { facebookAdapter } from './facebook';
import { instagramAdapter } from './instagram';
import { linkedinAdapter } from './linkedin';
import { pinterestAdapter } from './pinterest';
import { blueskyAdapter } from './bluesky';
import { mastodonAdapter } from './mastodon';

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
 * Real integrations register here. Facebook Pages, Instagram, LinkedIn member
 * profiles, Pinterest, Bluesky and Mastodon publish through their official
 * APIs. Platforms without an adapter are handled honestly by the worker:
 * manual platforms become MANUAL_ACTION_REQUIRED, automation targets without
 * an integration become NEEDS_AUTHORIZATION — never a fabricated success.
 */
export const adapters: Partial<Record<PlatformId, PlatformAdapter>> = {
  FACEBOOK: facebookAdapter,
  INSTAGRAM: instagramAdapter,
  LINKEDIN: linkedinAdapter,
  PINTEREST: pinterestAdapter,
  BLUESKY: blueskyAdapter,
  MASTODON: mastodonAdapter,
};

export function hasAdapter(platform: string): boolean {
  return Boolean(adapters[platform as PlatformId]);
}
