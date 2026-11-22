import { describe, expect, it } from 'vitest';
import { PLATFORMS, getPlatform, manualComposerHref } from './platforms';

describe('platform registry', () => {
  it('declares every supported destination once', () => {
    const ids = PLATFORMS.map((platform) => platform.id);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  it('never claims automated publishing for paid or API-less platforms', () => {
    for (const id of ['X', 'REDDIT', 'MEDIUM', 'QUORA'] as const) {
      const platform = getPlatform(id);
      expect(platform?.autoPublish).toBe(false);
      expect(platform?.automatedPhase).toBeNull();
      expect(platform?.manualFallback).toBe(true);
    }
  });

  it('marks the Phase 2 free integrations', () => {
    for (const id of ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'BLUESKY', 'MASTODON'] as const) {
      expect(getPlatform(id)?.automatedPhase).toBe(2);
    }
  });

  it('keeps review-gated integrations in Phase 3', () => {
    for (const id of ['LINKEDIN_PAGE', 'PINTEREST', 'YOUTUBE'] as const) {
      expect(getPlatform(id)?.automatedPhase).toBe(3);
    }
  });

  it('builds a prefilled X intent link and a Reddit submit link', () => {
    const tweet = manualComposerHref('X', { text: 'Hello #GetSavDown' });
    expect(tweet.startsWith('https://twitter.com/intent/tweet?')).toBe(true);
    expect(new URL(tweet).searchParams.get('text')).toBe('Hello #GetSavDown');
    const reddit = manualComposerHref('REDDIT', { text: 'Body', title: 'Title', url: 'https://getsavdown.com' });
    expect(reddit).toContain('reddit.com/submit?');
    expect(reddit).toContain('title=Title');
  });
});
