import type { DownloadRestriction } from '@/types';

/**
 * Central download-permission registry.
 *
 * Delivery is enabled for tools backed by the bundled yt-dlp binary. Tools
 * that have no working processor on this deployment remain explicitly
 * unavailable instead of silently failing.
 *
 * Keep this server-authoritative: routes gate on it, not just the UI.
 */

export type ToolPolicy = {
  downloadPermitted: boolean;
  metadataPermitted: boolean;
  restriction?: DownloadRestriction;
};

export const TOOL_UNAVAILABLE = 'TOOL_UNAVAILABLE';
export const DOWNLOAD_NOT_PERMITTED = 'DOWNLOAD_NOT_PERMITTED';

function unavailable(message: string): ToolPolicy {
  return {
    downloadPermitted: false,
    metadataPermitted: false,
    restriction: { code: TOOL_UNAVAILABLE, message },
  };
}

const ENABLED: ToolPolicy = { downloadPermitted: true, metadataPermitted: true };

const POLICIES: Record<string, ToolPolicy> = {
  'youtube-video-downloader': ENABLED,
  'youtube-shorts-downloader': ENABLED,
  'youtube-thumbnail-downloader': ENABLED,
  'youtube-to-mp3': ENABLED,
  'tiktok-video-downloader': ENABLED,
  'tiktok-to-mp3': ENABLED,
  'tiktok-thumbnail-downloader': ENABLED,
  'tiktok-photo-downloader': ENABLED,
  'instagram-reels-downloader': ENABLED,
  'instagram-profile-picture-downloader': ENABLED,
  'facebook-video-downloader': ENABLED,
  'facebook-reels-downloader': ENABLED,
  'x-video-downloader': ENABLED,
  'x-gif-downloader': ENABLED,
  'pinterest-video-downloader': ENABLED,
  'pinterest-image-downloader': ENABLED,
  'youtube-playlist-downloader': unavailable(
    'Playlist processing is not implemented yet. Use a direct video link with the YouTube Video Downloader.',
  ),
  'instagram-video-downloader': unavailable(
    'This route has no separate processor. Use the Instagram Reels Downloader with a /reel/, /p/ or /tv/ link.',
  ),
  'instagram-photo-downloader': unavailable(
    'Instagram photo and carousel extraction is not available on this deployment. Save the images you own from the Instagram app.',
  ),
  'instagram-story-downloader': unavailable(
    'Instagram Stories require an authenticated session and are not available through this tool.',
  ),
};

export function getToolPolicy(slug: string): ToolPolicy {
  return POLICIES[slug] ?? unavailable('This tool is not available.');
}
