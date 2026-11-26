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
  it('enforces the Bluesky 300 character limit', () => {
    expect(errors('BLUESKY', { caption: 'a'.repeat(300), media: [] })).toHaveLength(0);
    expect(errors('BLUESKY', { caption: 'a'.repeat(301), media: [] }).some((issue) => /300/.test(issue.message))).toBe(true);
  });

  it('requires media for Instagram and rejects non-JPEG images', () => {
    expect(errors('INSTAGRAM', { caption: 'hello', media: [] }).some((issue) => /requires/.test(issue.message))).toBe(true);
    expect(errors('INSTAGRAM', { caption: 'hello', media: [image('image/png')] }).some((issue) => /JPEG/.test(issue.message))).toBe(true);
    expect(errors('INSTAGRAM', { caption: 'hello', media: [image('image/jpeg')] })).toHaveLength(0);
  });

  it('accepts a video for Instagram Reels', () => {
    expect(errors('INSTAGRAM', { caption: 'hello', media: [video()] })).toHaveLength(0);
  });

  it('requires a title for Pinterest', () => {
    expect(errors('PINTEREST', { caption: 'pin', media: [image()] }).some((issue) => /title/i.test(issue.message))).toBe(true);
    expect(errors('PINTEREST', { caption: 'pin', title: 'Pin title', media: [image()] })).toHaveLength(0);
  });

  it('requires a Pinterest board only once an account is connected', () => {
    const post = { caption: 'pin', title: 'Pin title', media: [image()] };
    expect(errors('PINTEREST', post, { accountConnected: false })).toHaveLength(0);
    expect(errors('PINTEREST', post, { accountConnected: true })).toHaveLength(1);
    expect(errors('PINTEREST', post, { accountConnected: true, optionValues: { board: 'Tools' } })).toHaveLength(0);
  });

  it('warns (does not block) when an automation platform has no connected account', () => {
    const result = validateVariant({ caption: 'hello', media: [] }, { platform: 'BLUESKY' }, { accountConnected: false });
    expect(result.blocking).toBe(false);
    expect(result.issues.some((issue) => /No Bluesky account connected/.test(issue.message))).toBe(true);
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
