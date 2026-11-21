import { describe, expect, it } from 'vitest';
import { getToolPolicy, TOOL_UNAVAILABLE } from './downloaderPolicy';

const ENABLED_TOOLS = [
  'youtube-video-downloader',
  'youtube-shorts-downloader',
  'youtube-thumbnail-downloader',
  'youtube-to-mp3',
  'tiktok-video-downloader',
  'tiktok-to-mp3',
  'tiktok-thumbnail-downloader',
  'tiktok-photo-downloader',
  'instagram-reels-downloader',
  'instagram-profile-picture-downloader',
  'facebook-video-downloader',
  'facebook-reels-downloader',
  'x-video-downloader',
  'x-gif-downloader',
  'pinterest-video-downloader',
  'pinterest-image-downloader',
];

const UNAVAILABLE_TOOLS = [
  'youtube-playlist-downloader',
  'instagram-video-downloader',
  'instagram-photo-downloader',
  'instagram-story-downloader',
];

describe('downloader policy', () => {
  it.each(ENABLED_TOOLS)('permits delivery for %s', (slug) => {
    expect(getToolPolicy(slug)).toMatchObject({
      downloadPermitted: true,
      metadataPermitted: true,
    });
  });

  it.each(UNAVAILABLE_TOOLS)('blocks %s with a reason', (slug) => {
    const policy = getToolPolicy(slug);
    expect(policy.downloadPermitted).toBe(false);
    expect(policy.metadataPermitted).toBe(false);
    expect(policy.restriction?.code).toBe(TOOL_UNAVAILABLE);
    expect(policy.restriction?.message.length).toBeGreaterThan(20);
  });

  it('blocks unknown tools by default', () => {
    const policy = getToolPolicy('not-a-real-tool');
    expect(policy.downloadPermitted).toBe(false);
    expect(policy.metadataPermitted).toBe(false);
  });
});
