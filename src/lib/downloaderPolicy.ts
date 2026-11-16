import type { DownloadRestriction } from '@/types';

/**
 * Central download-permission registry.
 *
 * SavDown operates a compliance-first posture: public extraction of another
 * platform's media is not performed unless the platform's own terms authorize
 * it. Today only the YouTube thumbnail CDN is delivered; every other
 * downloader is metadata/preview only and points at the platform's official
 * download or export controls.
 *
 * Keep this server-authoritative: routes must gate on it, not just hide UI.
 */

export type ToolPolicy = {
  downloadPermitted: boolean;
  metadataPermitted: boolean;
  restriction?: DownloadRestriction;
};

export const DOWNLOAD_NOT_PERMITTED = 'DOWNLOAD_NOT_PERMITTED';

const officialReference = {
  youtube: {
    label: 'YouTube official download guidance',
    href: 'https://support.google.com/youtube/answer/56100',
    description: 'Use YouTube Studio for your own uploads or permitted offline viewing.',
  },
  tiktok: {
    label: 'TikTok download guidance',
    href: 'https://support.tiktok.com/en/using-tiktok/exploring-videos/video-downloads',
    description: 'Review creator download settings and the app’s official options.',
  },
  instagram: {
    label: 'Instagram Terms of Use',
    href: 'https://help.instagram.com/581066165581870',
    description: 'Review permitted use and use in-app export controls for your own content.',
  },
  facebook: {
    label: 'Facebook Terms',
    href: 'https://www.facebook.com/terms.php',
    description: 'Review permitted use and use Meta export controls for your own content.',
  },
  x: {
    label: 'X Terms of Service',
    href: 'https://x.com/en/tos',
    description: 'Review permitted use and download your own posts through X.',
  },
  pinterest: {
    label: 'Pinterest Terms of Service',
    href: 'https://policy.pinterest.com/en/terms-of-service',
    description: 'Review permitted use and use Pinterest export controls for your own pins.',
  },
} as const;

type PlatformKey = keyof typeof officialReference;

function previewOnly(platform: PlatformKey, label: string, metadataPermitted = true): ToolPolicy {
  return {
    downloadPermitted: false,
    metadataPermitted,
    restriction: {
      code: DOWNLOAD_NOT_PERMITTED,
      message: `SavDown shows preview information only for ${label}. ${label}’s published terms do not authorize downloading third-party public media, so no file is delivered. Use the platform’s own download or export option for content you own.`,
      alternatives: [officialReference[platform]],
    },
  };
}

const POLICIES: Record<string, ToolPolicy> = {
  'youtube-thumbnail-downloader': {
    downloadPermitted: true,
    metadataPermitted: true,
  },
  'youtube-video-downloader': previewOnly('youtube', 'YouTube'),
  'youtube-shorts-downloader': previewOnly('youtube', 'YouTube'),
  'youtube-to-mp3': previewOnly('youtube', 'YouTube'),
  'youtube-playlist-downloader': previewOnly('youtube', 'YouTube', false),
  'tiktok-video-downloader': previewOnly('tiktok', 'TikTok'),
  'tiktok-to-mp3': previewOnly('tiktok', 'TikTok'),
  'tiktok-thumbnail-downloader': previewOnly('tiktok', 'TikTok'),
  'tiktok-photo-downloader': previewOnly('tiktok', 'TikTok'),
  'instagram-reels-downloader': previewOnly('instagram', 'Instagram'),
  'instagram-video-downloader': previewOnly('instagram', 'Instagram', false),
  'instagram-photo-downloader': previewOnly('instagram', 'Instagram', false),
  'instagram-story-downloader': previewOnly('instagram', 'Instagram', false),
  'instagram-profile-picture-downloader': previewOnly('instagram', 'Instagram'),
  'facebook-video-downloader': previewOnly('facebook', 'Facebook'),
  'facebook-reels-downloader': previewOnly('facebook', 'Facebook'),
  'x-video-downloader': previewOnly('x', 'X'),
  'x-gif-downloader': previewOnly('x', 'X'),
  'pinterest-video-downloader': previewOnly('pinterest', 'Pinterest'),
  'pinterest-image-downloader': previewOnly('pinterest', 'Pinterest'),
};

export function getToolPolicy(slug: string): ToolPolicy {
  return POLICIES[slug] ?? {
    downloadPermitted: false,
    metadataPermitted: false,
    restriction: {
      code: DOWNLOAD_NOT_PERMITTED,
      message: 'Download delivery is not available for this tool.',
    },
  };
}
