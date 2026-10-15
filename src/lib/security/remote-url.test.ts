import { describe, expect, it } from 'vitest';
import { isSupportedPlatformUrl, isTrustedXMediaUrl } from './remote-url';

describe('remote URL allowlists', () => {
  it('accepts supported platform and X CDN hosts', () => {
    expect(isSupportedPlatformUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isSupportedPlatformUrl('https://vm.tiktok.com/example')).toBe(true);
    expect(isTrustedXMediaUrl('https://video.twimg.com/ext_tw_video/file.mp4')).toBe(true);
  });

  it('rejects internal, deceptive, credentialed, and non-HTTPS URLs', () => {
    for (const url of [
      'http://169.254.169.254/latest/meta-data',
      'https://youtube.com.evil.example/watch?v=abc',
      'https://evil.example/?next=tiktok.com',
      'https://user:pass@youtube.com/watch?v=abc',
      'https://youtube.com:8443/watch?v=abc',
    ]) expect(isSupportedPlatformUrl(url)).toBe(false);
    expect(isTrustedXMediaUrl('https://video.twimg.com.evil.example/file.mp4')).toBe(false);
  });
});

