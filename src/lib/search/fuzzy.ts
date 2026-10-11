/**
 * Fuzzy search fallback using Fuse.js.
 *
 * Fuse.js is DYNAMICALLY IMPORTED to keep it out of the initial page bundle.
 * This function is only called from search.ts when the main scorer produces
 * fewer than 3 results with score > 20.
 */

import type { SearchDocument } from './types';

/**
 * Run fuzzy search over the index using Fuse.js.
 *
 * @param query  - The raw search query
 * @param index  - The search index to search over
 * @param limit  - Maximum number of results to return
 * @returns      Matching documents sorted by fuzzy score
 */
export async function fuzzySearch(
  query: string,
  index: SearchDocument[],
  limit: number
): Promise<SearchDocument[]> {
  // Dynamic import — keeps Fuse.js out of the initial client bundle
  const { default: Fuse } = await import('fuse.js');

  const fuse = new Fuse(index, {
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'aliases', weight: 0.3 },
      { name: 'keywords', weight: 0.15 },
      { name: 'description', weight: 0.05 },
    ],
    threshold: 0.4,
    distance: 80,
    minMatchCharLength: 3,
    includeScore: true,
    shouldSort: true,
    ignoreLocation: false,
  });

  const results = fuse.search(query, { limit });

  return results
    .filter((r) => r.item !== undefined)
    .map((r) => r.item);
}
