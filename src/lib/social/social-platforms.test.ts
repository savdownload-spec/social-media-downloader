import { describe, expect, it } from 'vitest';
import { PLATFORMS, getPlatform, manualComposerHref } from './platforms';

describe('platform registry', () => {
  it('declares every supported destination once', () => {
    const ids = PLATFORMS.map((platform) => platform.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
  });

  it('drops platforms that cannot connect for free', () => {
    for (const id of ['X', 'REDDIT', 'MEDIUM', 'QUORA', 'YOUTUBE', 'LINKEDIN_PAGE']) {
      expect(getPlatform(id)).toBeNull();
    }
  });

  it('marks the free API integrations as automated', () => {
    for (const id of ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'PINTEREST', 'BLUESKY', 'MASTODON'] as const) {
      expect(getPlatform(id)?.automatedPhase).toBe(2);
    }
  });

  it('links the manual workflow to each official composer', () => {
    const linkedin = manualComposerHref('LINKEDIN', { text: 'Hello' });
    expect(linkedin).toContain('linkedin.com');
    const bluesky = manualComposerHref('BLUESKY', { text: 'Hello' });
    expect(bluesky).toContain('bsky.app');
    const pinterest = manualComposerHref('PINTEREST', { text: 'Hello', title: 'Pin' });
    expect(pinterest).toContain('pinterest.com');
  });
});
