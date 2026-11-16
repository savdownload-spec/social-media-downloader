import { describe, expect, it } from 'vitest';
import { DOWNLOAD_NOT_PERMITTED, getToolPolicy } from './downloaderPolicy';

const BLOCKED_TOOLS = [
  'youtube-video-downloader',
  'youtube-shorts-downloader',
  'youtube-to-mp3',
  'youtube-playlist-downloader',
  'tiktok-video-downloader',
  'tiktok-to-mp3',
  'tiktok-thumbnail-downloader',
  'tiktok-photo-downloader',
  'instagram-reels-downloader',
  'instagram-video-downloader',
  'instagram-photo-downloader',
  'instagram-story-downloader',
  'instagram-profile-picture-downloader',
  'facebook-video-downloader',
  'facebook-reels-downloader',
  'x-video-downloader',
  'x-gif-downloader',
  'pinterest-video-downloader',
  'pinterest-image-downloader',
];

describe('downloader policy', () => {
  it('permits the YouTube thumbnail CDN download', () => {
    expect(getToolPolicy('youtube-thumbnail-downloader')).toMatchObject({
      downloadPermitted: true,
      metadataPermitted: true,
    });
  });

  it.each(BLOCKED_TOOLS)('blocks media delivery for %s', (slug) => {
    const policy = getToolPolicy(slug);
    expect(policy.downloadPermitted).toBe(false);
    expect(policy.restriction?.code).toBe(DOWNLOAD_NOT_PERMITTED);
    expect(policy.restriction?.message).toMatch(/do not authorize downloading third-party public media/);
  });

  it('blocks unknown tools by default', () => {
    const policy = getToolPolicy('not-a-real-tool');
    expect(policy.downloadPermitted).toBe(false);
    expect(policy.metadataPermitted).toBe(false);
  });

  it('does not run metadata extraction for tools with no processor', () => {
    expect(getToolPolicy('youtube-playlist-downloader').metadataPermitted).toBe(false);
    expect(getToolPolicy('instagram-video-downloader').metadataPermitted).toBe(false);
    expect(getToolPolicy('instagram-story-downloader').metadataPermitted).toBe(false);
  });
});
