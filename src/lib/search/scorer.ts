/**
 * Scoring engine for the SavDown search.
 *
 * Implements tiered relevance scoring with proximity bonuses, synonym
 * expansion, and directional pair matching (e.g. "jpg → webp").
 *
 * Tier priority (highest first):
 *   1.  Exact title match        (100 pts)
 *   2.  Exact slug match         ( 80 pts)
 *   3.  Exact alias match        ( 75 pts)
 *   4.  All tokens in title      ( 65 pts)
 *   5.  Directional pair slug    ( 60 pts)
 *   6.  Majority tokens in title ( 45 pts)
 *   7.  Alias/synonym token match( 35 pts)
 *   8.  Description token match  ( 20 pts)
 *   9.  Category match           ( 10 pts)
 *  10.  Content match            (  5 pts)
 *
 * Bonuses:
 *   +15 proximity (all query tokens within 3 adjacent title tokens)
 *   +10 token order in title matches query order
 *
 * Final score = raw points × doc.priority
 */

import type { SearchDocument } from './types';
import { normalizeQuery, tokenizeQuery } from './normalizer';
import { expandSynonyms } from './synonyms';
import { stem } from '@/lib/support-knowledge';

// ── NormalizedQuery type ──────────────────────────────────────────────────────

export interface NormalizedQuery {
  /** The raw input */
  raw: string;
  /** Lowercased, punctuation-stripped */
  normalized: string;
  /** Stemmed tokens */
  tokens: string[];
  /** Adjacent token pairs, e.g. [['jpg','webp'], ['pdf','word']] */
  pairs: [string, string][];
  /** Tokens expanded with synonyms */
  synonymTokens: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Tokenize the title of a document for fast comparison */
function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(stem);
}

/** Check if two stemmed tokens are equal or prefix-compatible */
function tokenEq(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return shorter.length >= 4 && longer.startsWith(shorter);
}

/** Count how many of `needles` appear in `haystack` (stemmed comparison) */
function countTokenMatches(needles: string[], haystack: string[]): number {
  return needles.filter((n) => haystack.some((h) => tokenEq(n, h))).length;
}

/**
 * Extract directional pairs from tokens.
 * "jpg to webp" → [['jpg','webp']]
 * "pdf word"    → [['pdf','word']]  (adjacent non-stopword tokens)
 */
function extractPairs(tokens: string[]): [string, string][] {
  const pairs: [string, string][] = [];
  const stops = new Set(['to', 'into', 'from', 'as', 'and', 'the', 'a', 'an']);

  const meaningful = tokens.filter((t) => !stops.has(t));
  for (let i = 0; i < meaningful.length - 1; i++) {
    pairs.push([meaningful[i], meaningful[i + 1]]);
  }
  return pairs;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build a NormalizedQuery from a raw search string.
 */
export function buildNormalizedQuery(query: string): NormalizedQuery {
  const normalized = normalizeQuery(query);
  const tokens = tokenizeQuery(query);
  const synonymTokens = expandSynonyms(tokens);
  const pairs = extractPairs(tokens);

  return { raw: query, normalized, tokens, pairs, synonymTokens };
}

/**
 * Score a single document against a normalized query.
 * Returns 0 if there is no meaningful match.
 */
export function scoreDocument(nq: NormalizedQuery, doc: SearchDocument): number {
  let score = 0;
  const { tokens, pairs, synonymTokens } = nq;

  if (tokens.length === 0) return 0;

  const docTitleLower = doc.title.toLowerCase();
  const docSlugLower = doc.slug.toLowerCase();
  const normalizedTitle = normalizeQuery(doc.title);
  const tTokens = titleTokens(doc.title);
  const descLower = doc.description.toLowerCase();
  const contentLower = doc.content.toLowerCase();
  const catLower = doc.category.toLowerCase();
  const normalizedNq = nq.normalized;

  // Normalize aliases for matching
  const aliasesLower = doc.aliases.map((a) => a.toLowerCase());
  const slugSpaced = docSlugLower.replace(/-/g, ' ');

  // ── Tier 1: Exact title match (100 pts) ───────────────────────────────────
  if (
    normalizedTitle === normalizedNq ||
    docTitleLower === nq.raw.toLowerCase()
  ) {
    score += 100;
  }

  // ── Tier 2: Exact slug match (80 pts) ─────────────────────────────────────
  if (docSlugLower === normalizedNq.replace(/\s+/g, '-') || slugSpaced === normalizedNq) {
    score += 80;
  }

  // ── Tier 3: Exact alias match (75 pts) ────────────────────────────────────
  const exactAlias = aliasesLower.some(
    (a) => a === normalizedNq || a === nq.raw.toLowerCase()
  );
  if (exactAlias) {
    score += 75;
  }

  // ── Tier 4: All tokens in title (65 pts) ──────────────────────────────────
  if (tokens.length > 0) {
    const allInTitle = countTokenMatches(tokens, tTokens) === tokens.length;
    if (allInTitle) {
      score += 65;

      // ── Proximity bonus (+15): all tokens appear within 3 consecutive title tokens
      const windowSize = Math.max(tokens.length, 3);
      let proximityBonus = false;
      for (let start = 0; start <= tTokens.length - tokens.length; start++) {
        const window = tTokens.slice(start, start + windowSize);
        const windowMatches = countTokenMatches(tokens, window);
        if (windowMatches === tokens.length) {
          proximityBonus = true;
          break;
        }
      }
      if (proximityBonus) score += 15;

      // ── Order bonus (+10): token order in query matches order in title
      let orderBonus = true;
      let lastIdx = -1;
      for (const tok of tokens) {
        const idx = tTokens.findIndex((t, i) => i > lastIdx && tokenEq(t, tok));
        if (idx === -1) {
          orderBonus = false;
          break;
        }
        lastIdx = idx;
      }
      if (orderBonus) score += 10;
    }
  }

  // ── Tier 5: Directional pair slug/alias match (60 pts) ────────────────────
  for (const [a, b] of pairs) {
    // Check if slug matches "a-to-b" or "b-to-a"
    if (
      docSlugLower === `${a}-to-${b}` ||
      docSlugLower === `${b}-to-${a}` ||
      docSlugLower.includes(`${a}-to-${b}`) ||
      docSlugLower.includes(`${b}-to-${a}`)
    ) {
      score += 60;
      break;
    }
    // Also check if both tokens appear in aliases
    const aInAlias = aliasesLower.some((al) => al.includes(a));
    const bInTitle = tTokens.some((t) => tokenEq(t, b));
    const bInAlias = aliasesLower.some((al) => al.includes(b));
    const aInTitle = tTokens.some((t) => tokenEq(t, a));
    if ((aInAlias || aInTitle) && (bInAlias || bInTitle)) {
      score += 50;
      break;
    }
  }

  // ── Tier 6: Majority tokens in title (45 pts) ─────────────────────────────
  if (tokens.length > 1) {
    const matchCount = countTokenMatches(tokens, tTokens);
    if (matchCount >= Math.ceil(tokens.length * 0.6) && score < 60) {
      score += 45 * (matchCount / tokens.length);
    }
  }

  // ── Tier 7: Alias/synonym token match (35 pts) ───────────────────────────
  // Check if the doc's aliases contain a phrase that includes ALL query tokens.
  // This is stricter than matching individual tokens to prevent false positives.
  if (score < 50) {
    const aliasText = aliasesLower.join(' ');
    const keywordText = doc.keywords.join(' ').toLowerCase();

    // Check for whole-query match in aliases (strong signal)
    if (aliasesLower.some((a) => a.includes(normalizedNq))) {
      score += 35;
    } else if (tokens.length > 0) {
      // Check how many query tokens appear in aliases (weaker signal)
      // Use query tokens only (not synonyms) to avoid false positives
      const aliasMatchCount = tokens.filter((tok) =>
        aliasText.includes(tok) || keywordText.includes(tok)
      ).length;
      if (aliasMatchCount === tokens.length) {
        // All tokens matched in aliases — good signal
        score += 30;
      } else if (aliasMatchCount > 0) {
        // Partial match — weaker signal
        score += 15 * (aliasMatchCount / tokens.length);
      }
    }
  }

  // ── Tier 8: Description token match (20 pts) ─────────────────────────────
  if (score < 30) {
    const descMatchCount = countTokenMatches(tokens, descLower.split(/\s+/).map(stem));
    if (descMatchCount > 0) {
      score += 20 * (descMatchCount / tokens.length);
    }
  }

  // ── Tier 9: Category match (10 pts) ──────────────────────────────────────
  if (score < 20) {
    const catMatchCount = countTokenMatches(tokens, catLower.split(/\s+/).map(stem));
    if (catMatchCount > 0) {
      score += 10;
    }
  }

  // ── Tier 10: Content match (5 pts) ───────────────────────────────────────
  if (score < 10) {
    const contentTokens = contentLower.split(/\s+/).map(stem);
    const contentMatchCount = countTokenMatches(tokens, contentTokens);
    if (contentMatchCount > 0) {
      score += 5 * (contentMatchCount / tokens.length);
    }
  }

  // ── Apply priority multiplier ─────────────────────────────────────────────
  if (score > 0) {
    score = score * doc.priority;
  }

  return score;
}
