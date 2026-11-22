import { describe, expect, it } from 'vitest';
import { validateVariant, type VariantContext } from './validation';

const image = (mimeType = 'image/jpeg') => ({
  kind: 'IMAGE' as const,
  mimeType,
  width: 1080,
  height: 1080,
  sizeBytes: 1024,
});

const video = (mimeType = 'video/mp4') => ({
  kind: 'VIDEO' as const,
  mimeType,
  width: 1920,
  height: 1080,
  sizeBytes: 10 * 1024 * 1024,
});

function errors(
  platform: Parameters<typeof validateVariant>[1]['platform'],
  post: Parameters<typeof validateVariant>[0],
  ctx: VariantContext = { accountConnected: false },
) {
  return validateVariant(post, { platform }, ctx).issues.filter((issue) => issue.level === 'error');
}

describe('platform validation', () => {
  it('enforces X 280 characters including a 23-character link allowance', () => {
    const base = { caption: 'a'.repeat(280), media: [] };
    expect(errors('X', base)).toHaveLength(0);
    const withLink = { ...base, linkUrl: 'https://getsavdown.com/blog/a-very-long-slug' };
    expect(errors('X', withLink).some((issue) => /280/.test(issue.message))).toBe(true);
  });

  it('requires media for Instagram and rejects non-JPEG images', () => {
    expect(errors('INSTAGRAM', { caption: 'hello', media: [] }).some((issue) => /requires/.test(issue.message))).toBe(true);
    expect(errors('INSTAGRAM', { caption: 'hello', media: [image('image/png')] }).some((issue) => /JPEG/.test(issue.message))).toBe(true);
    expect(errors('INSTAGRAM', { caption: 'hello', media: [image('image/jpeg')] })).toHaveLength(0);
  });

  it('requires a video and a title for YouTube', () => {
    const result = errors('YOUTUBE', { caption: 'desc', media: [] });
    expect(result.some((issue) => /image or video/.test(issue.message))).toBe(true);
    expect(result.some((issue) => /title/i.test(issue.message))).toBe(true);
    expect(errors('YOUTUBE', { caption: 'desc', title: 'Video title', media: [video()] })).toHaveLength(0);
  });

  it('requires a Pinterest board only once an account is connected', () => {
    const post = { caption: 'pin', title: 'Pin title', media: [image()] };
    expect(errors('PINTEREST', post, { accountConnected: false })).toHaveLength(0);
    expect(errors('PINTEREST', post, { accountConnected: true })).toHaveLength(1);
    expect(errors('PINTEREST', post, { accountConnected: true, optionValues: { board: 'Tools' } })).toHaveLength(0);
  });

  it('warns (does not block) that manual-only platforms will not auto-publish', () => {
    const result = validateVariant({ caption: 'hello', media: [] }, { platform: 'MEDIUM' }, { accountConnected: false });
    expect(result.blocking).toBe(false);
    expect(result.issues.some((issue) => /Manual publishing only/.test(issue.message))).toBe(true);
  });

  it('rejects malformed destination links', () => {
    expect(errors('FACEBOOK', { caption: 'hello', linkUrl: 'not-a-url', media: [] })).toHaveLength(1);
  });

  it('warns about Instagram aspect ratios when dimensions are known', () => {
    const tall = { kind: 'IMAGE' as const, mimeType: 'image/jpeg', width: 1080, height: 1920, sizeBytes: 1000 };
    const result = validateVariant({ caption: 'x', media: [tall] }, { platform: 'INSTAGRAM' }, { accountConnected: false });
    expect(result.issues.some((issue) => /aspect ratio/.test(issue.message))).toBe(true);
    expect(result.blocking).toBe(false);
  });
});
