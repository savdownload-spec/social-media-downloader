import { describe, expect, it } from 'vitest';
import {
  authorInitials,
  normalizeHttpUrl,
  parseExpertise,
  parseSocials,
  serializeSocials,
  slugifyAuthorName,
  validateSocialLinks,
} from './author-profile';

describe('normalizeHttpUrl', () => {
  it('upgrades a bare domain to https', () => {
    expect(normalizeHttpUrl('linkedin.com/in/example')).toBe('https://linkedin.com/in/example');
  });

  it('keeps http and https URLs', () => {
    expect(normalizeHttpUrl('https://github.com/example')).toBe('https://github.com/example');
    expect(normalizeHttpUrl('http://example.com')).toBe('http://example.com/');
  });

  it('rejects unsafe or malformed values', () => {
    for (const value of ['', 'javascript:alert(1)', 'data:text/html,x', 'ftp://example.com', '//example.com', 'https://user:pass@example.com', 'not a url']) {
      expect(normalizeHttpUrl(value), value).toBeNull();
    }
  });
});

describe('parseSocials', () => {
  it('normalizes legacy twitter keys and drops unsafe URLs', () => {
    const links = parseSocials(JSON.stringify({
      twitter: 'https://x.com/example',
      linkedin: 'https://linkedin.com/in/example',
      github: 'javascript:alert(1)',
      website: 'https://example.com',
    }));
    expect(links).toEqual([
      { platform: 'linkedin', url: 'https://linkedin.com/in/example' },
      { platform: 'x', url: 'https://x.com/example' },
    ]);
  });

  it('returns an empty list for missing or invalid JSON', () => {
    expect(parseSocials(null)).toEqual([]);
    expect(parseSocials('not json')).toEqual([]);
    expect(parseSocials('[]')).toEqual([]);
  });

  it('keeps one link per platform', () => {
    const links = parseSocials(JSON.stringify({ x: 'https://x.com/one', twitter: 'https://x.com/two' }));
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe('https://x.com/one');
  });
});

describe('validateSocialLinks', () => {
  it('accepts unique supported platforms', () => {
    const result = validateSocialLinks([
      { platform: 'linkedin', url: 'linkedin.com/in/example' },
      { platform: 'github', url: 'https://github.com/example' },
    ]);
    expect(result.errors).toEqual([]);
    expect(result.links).toEqual([
      { platform: 'linkedin', url: 'https://linkedin.com/in/example' },
      { platform: 'github', url: 'https://github.com/example' },
    ]);
  });

  it('rejects duplicates, unsupported platforms, and unsafe URLs', () => {
    const result = validateSocialLinks([
      { platform: 'linkedin', url: 'https://linkedin.com/in/one' },
      { platform: 'linkedin', url: 'https://linkedin.com/in/two' },
      { platform: 'myspace', url: 'https://example.com' },
      { platform: 'x', url: 'javascript:alert(1)' },
    ]);
    expect(result.links).toHaveLength(1);
    expect(result.errors).toHaveLength(3);
  });

  it('accepts an empty section', () => {
    expect(validateSocialLinks([])).toEqual({ links: [], errors: [] });
    expect(validateSocialLinks(undefined)).toEqual({ links: [], errors: [] });
  });
});

describe('serializeSocials', () => {
  it('stores a platform map with normalized URLs', () => {
    expect(JSON.parse(serializeSocials([{ platform: 'x', url: 'x.com/example' }]))).toEqual({
      x: 'https://x.com/example',
    });
  });
});

describe('expertise', () => {
  it('parses, trims, and de-duplicates items', () => {
    expect(parseExpertise(JSON.stringify(['SEO ', 'seo', ' Content Strategy ', '', 4]))).toEqual([
      'SEO',
      'Content Strategy',
    ]);
  });

  it('caps the list', () => {
    const items = Array.from({ length: 20 }, (_, index) => `Skill ${index}`);
    expect(parseExpertise(JSON.stringify(items))).toHaveLength(12);
  });
});

describe('profile names', () => {
  it('builds URL-safe slugs', () => {
    expect(slugifyAuthorName('  Sarah Jöhnson — Writer  ')).toBe('sarah-johnson-writer');
    expect(slugifyAuthorName('---')).toBe('');
  });

  it('builds initials', () => {
    expect(authorInitials('Sarah Johnson')).toBe('SJ');
    expect(authorInitials('SavDown')).toBe('S');
  });
});
