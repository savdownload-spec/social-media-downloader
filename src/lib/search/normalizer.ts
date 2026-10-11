/**
 * Query and text normalization utilities for the SavDown search engine.
 *
 * stem() and tokenize() are REUSED from src/lib/support-knowledge.ts —
 * they are NOT reimplemented here.
 */

import { stem, tokenize } from '@/lib/support-knowledge';

/** Common abbreviation expansions applied during query normalization */
const ABBREVIATIONS: Record<string, string> = {
  yt: 'youtube',
  ytb: 'youtube',
  ig: 'instagram',
  insta: 'instagram',
  fb: 'facebook',
  tt: 'tiktok',
};

/**
 * Handle "pdf2word" and "jpg2png" style concatenations by inserting
 * spaces around the digit '2' when it separates words.
 */
function expandNumericTo(raw: string): string {
  return raw.replace(/([a-z])2([a-z])/gi, '$1 to $2');
}

/**
 * Expand known abbreviations.
 * Only expands whole tokens (word-boundary aware via split/join).
 */
function expandAbbreviations(normalized: string): string {
  return normalized
    .split(/\s+/)
    .map((token) => ABBREVIATIONS[token] ?? token)
    .join(' ');
}

/**
 * Normalize a search query for matching.
 *
 * Steps:
 *   1. Lowercase and trim
 *   2. Handle "pdf2word" style (insert space around 2)
 *   3. Replace punctuation (except hyphens between words) with space
 *   4. Replace hyphens, underscores, slashes with space
 *   5. Collapse whitespace
 *   6. Expand abbreviations
 */
export function normalizeQuery(raw: string): string {
  let s = raw.toLowerCase().trim();

  // Handle pdf2word, jpg2png style
  s = expandNumericTo(s);

  // Replace punctuation (but not hyphens yet, handled next)
  s = s.replace(/[^\w\s-]/g, ' ');

  // Replace hyphens, underscores, slashes with space
  s = s.replace(/[-_/\\]+/g, ' ');

  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();

  // Expand abbreviations
  s = expandAbbreviations(s);

  return s;
}

/**
 * Normalize indexed document text — same as normalizeQuery but also
 * strips any HTML tags.
 */
export function normalizeText(raw: string): string {
  // Strip HTML tags
  let s = raw.replace(/<[^>]+>/g, ' ');

  s = s.toLowerCase().trim();
  s = expandNumericTo(s);
  s = s.replace(/[^\w\s-]/g, ' ');
  s = s.replace(/[-_/\\]+/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Tokenize a search query into normalized, stemmed, stop-word-filtered tokens.
 *
 * Uses tokenize() from support-knowledge.ts which already handles stop word
 * removal and stemming — ensuring consistent behavior with the rest of the
 * SavDown NLP pipeline.
 */
export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeQuery(query);
  // tokenize() from support-knowledge handles stop words, stemming, and min length
  return tokenize(normalized);
}

// Re-export stem for use in scorer
export { stem };
