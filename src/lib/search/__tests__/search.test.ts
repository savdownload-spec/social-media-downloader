/**
 * Search engine integration tests.
 *
 * Each test verifies that a realistic user query returns the expected tool
 * as the top result (or at minimum in the top results).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { search } from '@/lib/search/search';
import { buildSearchIndex } from '@/lib/search/indexBuilder';
import type { SearchResult } from '@/lib/search/types';

// Pre-warm the index so timing doesn't affect tests
beforeAll(() => {
  buildSearchIndex();
});

// ── Helper ────────────────────────────────────────────────────────────────────

async function topUrl(query: string): Promise<string> {
  const results = await search(query);
  return results[0]?.url ?? '';
}

async function topUrls(query: string, n = 3): Promise<string[]> {
  const results = await search(query, { limit: n });
  return results.map((r) => r.url);
}

// ── Index sanity ──────────────────────────────────────────────────────────────

describe('Search Index', () => {
  it('should build more than 80 documents', () => {
    const index = buildSearchIndex();
    expect(index.length).toBeGreaterThan(80);
  });

  it('should contain the pdf-to-word tool with correct url', () => {
    const index = buildSearchIndex();
    const doc = index.find((d) => d.id === 'tool-pdf-to-word');
    expect(doc).toBeDefined();
    expect(doc?.url).toBe('/tools/pdf-to-word');
  });

  it('should contain the webp-converter tool with jpg-to-webp alias', () => {
    const index = buildSearchIndex();
    const doc = index.find((d) => d.id === 'tool-webp-converter');
    expect(doc).toBeDefined();
    const hasAlias = doc?.aliases.some(
      (a) => a.toLowerCase().includes('jpg to webp') || a.toLowerCase().includes('jpg webp')
    );
    expect(hasAlias).toBe(true);
  });
});

// ── PDF tools ────────────────────────────────────────────────────────────────

describe('PDF tools', () => {
  it('"pdf to word" → pdf-to-word', async () => {
    expect(await topUrl('pdf to word')).toBe('/tools/pdf-to-word');
  });

  it('"pdf word" → pdf-to-word', async () => {
    expect(await topUrl('pdf word')).toBe('/tools/pdf-to-word');
  });

  it('"convert pdf to docx" → pdf-to-word', async () => {
    expect(await topUrl('convert pdf to docx')).toBe('/tools/pdf-to-word');
  });

  it('"pdf-to-word" (hyphenated) → pdf-to-word', async () => {
    expect(await topUrl('pdf-to-word')).toBe('/tools/pdf-to-word');
  });

  it('"word to pdf" → word-to-pdf', async () => {
    expect(await topUrl('word to pdf')).toBe('/tools/word-to-pdf');
  });

  it('"merge pdf" → merge-pdf', async () => {
    expect(await topUrl('merge pdf')).toBe('/tools/merge-pdf');
  });

  it('"combine pdfs" → merge-pdf', async () => {
    expect(await topUrl('combine pdfs')).toBe('/tools/merge-pdf');
  });

  it('"join pdfs" → merge-pdf', async () => {
    expect(await topUrl('join pdfs')).toBe('/tools/merge-pdf');
  });

  it('"split pdf" → split-pdf', async () => {
    expect(await topUrl('split pdf')).toBe('/tools/split-pdf');
  });

  it('"separate pdf pages" → split-pdf', async () => {
    expect(await topUrl('separate pdf pages')).toBe('/tools/split-pdf');
  });

  it('"compress pdf" → compress-pdf', async () => {
    expect(await topUrl('compress pdf')).toBe('/tools/compress-pdf');
  });

  it('"reduce pdf size" → compress-pdf', async () => {
    expect(await topUrl('reduce pdf size')).toBe('/tools/compress-pdf');
  });

  it('"pdf to jpg" → pdf-to-jpg', async () => {
    expect(await topUrl('pdf to jpg')).toBe('/tools/pdf-to-jpg');
  });

  it('"jpg to pdf" → jpg-to-pdf', async () => {
    expect(await topUrl('jpg to pdf')).toBe('/tools/jpg-to-pdf');
  });
});

// ── Image tools ───────────────────────────────────────────────────────────────

describe('Image tools', () => {
  it('"jpg to webp" → webp-converter', async () => {
    expect(await topUrl('jpg to webp')).toBe('/tools/webp-converter');
  });

  it('"jpg webp" → webp-converter', async () => {
    expect(await topUrl('jpg webp')).toBe('/tools/webp-converter');
  });

  it('"jpeg to webp" → webp-converter', async () => {
    expect(await topUrl('jpeg to webp')).toBe('/tools/webp-converter');
  });

  it('"convert jpg webp" → webp-converter', async () => {
    expect(await topUrl('convert jpg webp')).toBe('/tools/webp-converter');
  });

  it('"image to webp" → webp-converter', async () => {
    const url = await topUrl('image to webp');
    expect(url).toBe('/tools/webp-converter');
  });

  it('"webp converter" → webp-converter', async () => {
    expect(await topUrl('webp converter')).toBe('/tools/webp-converter');
  });
});

// ── Downloader tools ──────────────────────────────────────────────────────────

describe('Downloader tools', () => {
  it('"youtube downloader" → youtube-video-downloader', async () => {
    expect(await topUrl('youtube downloader')).toBe('/tools/youtube-video-downloader');
  });

  it('"instagram reels downloader" → instagram-reels-downloader', async () => {
    const url = await topUrl('instagram reels downloader');
    expect(url).toContain('instagram');
  });
});

// ── Typo tolerance ────────────────────────────────────────────────────────────

describe('Typo tolerance', () => {
  it('"jpg to wepb" (typo) → webp-converter', async () => {
    const results = await search('jpg to wepb', { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    const urls = results.map((r) => r.url);
    expect(urls).toContain('/tools/webp-converter');
  });

  it('"instgram downloader" (typo) → an instagram tool', async () => {
    const results = await search('instgram downloader', { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    const hasInstagram = results.some((r) => r.url.includes('instagram'));
    expect(hasInstagram).toBe(true);
  });

  it('"youtub downloader" (typo) → youtube-video-downloader', async () => {
    const results = await search('youtub downloader', { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    const hasYoutube = results.some((r) => r.url.includes('youtube'));
    expect(hasYoutube).toBe(true);
  });
});

// ── Intent queries ────────────────────────────────────────────────────────────

describe('Intent queries', () => {
  it('"how many credits do i get" → pricing or credits page', async () => {
    const results = await search('how many credits do i get', { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    const hasCredits = results.some(
      (r) => r.url.includes('pricing') || r.url.includes('credits') || r.url.includes('faq')
    );
    expect(hasCredits).toBe(true);
  });

  it('"what plans do you have" → pricing page', async () => {
    const results = await search('what plans do you have', { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    const hasPricing = results.some((r) => r.url.includes('pricing'));
    expect(hasPricing).toBe(true);
  });
});

// ── Blog vs Tool ranking ──────────────────────────────────────────────────────

describe('Blog vs Tool ranking', () => {
  it('blog articles should NOT outrank directly matched tools for "pdf to word"', async () => {
    const results = await search('pdf to word', { limit: 10 });
    const toolResult = results.find((r) => r.url === '/tools/pdf-to-word');
    const blogResults = results.filter((r) => r.type === 'blog');

    if (toolResult && blogResults.length > 0) {
      for (const blog of blogResults) {
        expect(toolResult.score).toBeGreaterThan(blog.score);
      }
    }
    // The tool must appear in the results
    expect(toolResult).toBeDefined();
  });

  it('blog articles should NOT outrank directly matched tools for "jpg to webp"', async () => {
    const results = await search('jpg to webp', { limit: 10 });
    const toolResult = results.find((r) => r.url === '/tools/webp-converter');
    const blogResults = results.filter((r) => r.type === 'blog');

    if (toolResult && blogResults.length > 0) {
      for (const blog of blogResults) {
        expect(toolResult.score).toBeGreaterThan(blog.score);
      }
    }
    expect(toolResult).toBeDefined();
  });
});
