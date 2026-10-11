/**
 * Main search entry point for the SavDown search engine.
 *
 * Pipeline:
 *   1. Short-circuit if query is too short
 *   2. Build NormalizedQuery
 *   3. Score every document in the index
 *   4. Filter to score > 0
 *   5. If fewer than 3 confident results, augment with fuzzy search
 *   6. Sort by score (desc), then by priority as tiebreaker
 *   7. Deduplicate by url (keep highest score)
 *   8. Return top N as SearchResult[]
 */

import type { SearchDocument, SearchResult, SearchOptions } from './types';
import { getSearchIndex } from './indexBuilder';
import { buildNormalizedQuery, scoreDocument } from './scorer';
import { fuzzySearch } from './fuzzy';

const DEFAULT_LIMIT = 20;
const FUZZY_TRIGGER_THRESHOLD = 20;
const FUZZY_MIN_CONFIDENT_RESULTS = 3;
/** Fuzzy results get this score cap so they never outrank confident matches */
const FUZZY_SCORE_CAP = 15;

// ── Internal helpers ──────────────────────────────────────────────────────────

function toSearchResult(
  doc: SearchDocument,
  score: number,
  matchedFields: string[]
): SearchResult {
  return { ...doc, score, matchedFields };
}

function deduplicateByUrl(results: SearchResult[]): SearchResult[] {
  const seen = new Map<string, SearchResult>();
  for (const r of results) {
    const existing = seen.get(r.url);
    if (!existing || r.score > existing.score) {
      seen.set(r.url, r);
    }
  }
  return [...seen.values()];
}

function buildMatchedFields(doc: SearchDocument, query: string): string[] {
  const fields: string[] = [];
  const q = query.toLowerCase();
  if (doc.title.toLowerCase().includes(q)) fields.push('title');
  if (doc.description.toLowerCase().includes(q)) fields.push('description');
  if (doc.aliases.some((a) => a.toLowerCase().includes(q))) fields.push('alias');
  if (doc.keywords.some((k) => k.toLowerCase().includes(q))) fields.push('keyword');
  if (doc.content.toLowerCase().includes(q)) fields.push('content');
  if (fields.length === 0) fields.push('searchableText');
  return fields;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search the SavDown index asynchronously.
 * Falls back to fuzzy matching when exact/token scoring produces sparse results.
 */
export async function search(
  query: string,
  options?: SearchOptions
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const index = getSearchIndex();

  // Apply type filter if specified
  const filteredIndex =
    options?.types && options.types.length > 0
      ? index.filter((doc) => options.types!.includes(doc.type))
      : index;

  // Build normalized query once
  const nq = buildNormalizedQuery(trimmed);

  // Score every document
  const scored: SearchResult[] = [];
  for (const doc of filteredIndex) {
    const score = scoreDocument(nq, doc);
    if (score > 0) {
      scored.push(toSearchResult(doc, score, buildMatchedFields(doc, trimmed)));
    }
  }

  // Count confident results
  const confidentResults = scored.filter((r) => r.score > FUZZY_TRIGGER_THRESHOLD);

  // Augment with fuzzy search if we don't have enough confident results
  if (confidentResults.length < FUZZY_MIN_CONFIDENT_RESULTS) {
    try {
      const fuzzyResults = await fuzzySearch(trimmed, filteredIndex, limit);
      for (const fDoc of fuzzyResults) {
        // Check if this doc is already in scored
        const existing = scored.find((r) => r.url === fDoc.url);
        if (existing) {
          // Boost existing low-scoring result slightly if fuzzy agrees
          if (existing.score < FUZZY_SCORE_CAP) {
            existing.score = Math.max(existing.score, FUZZY_SCORE_CAP);
          }
        } else {
          // Add new fuzzy result with capped score
          scored.push(
            toSearchResult(fDoc, FUZZY_SCORE_CAP, ['fuzzy'])
          );
        }
      }
    } catch {
      // Fuzzy search failure is non-fatal; continue with scorer results
    }
  }

  // Sort by score descending, priority as tiebreaker
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.priority - a.priority;
  });

  // Deduplicate by URL
  const deduped = deduplicateByUrl(scored);

  // Re-sort after dedup (order may change slightly)
  deduped.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.priority - a.priority;
  });

  return deduped.slice(0, limit);
}

/**
 * Synchronous variant of search — skips fuzzy matching.
 * Safe to use during SSR where async is inconvenient.
 */
export function searchSync(
  query: string,
  options?: SearchOptions
): SearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const limit = options?.limit ?? DEFAULT_LIMIT;
  const index = getSearchIndex();

  const filteredIndex =
    options?.types && options.types.length > 0
      ? index.filter((doc) => options.types!.includes(doc.type))
      : index;

  const nq = buildNormalizedQuery(trimmed);

  const scored: SearchResult[] = [];
  for (const doc of filteredIndex) {
    const score = scoreDocument(nq, doc);
    if (score > 0) {
      scored.push(toSearchResult(doc, score, buildMatchedFields(doc, trimmed)));
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.priority - a.priority;
  });

  const deduped = deduplicateByUrl(scored);
  deduped.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.priority - a.priority;
  });

  return deduped.slice(0, limit);
}
