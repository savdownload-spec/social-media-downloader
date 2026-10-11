/**
 * Core type definitions for the SavDown search engine.
 */

export type SearchDocumentType = 'tool' | 'blog' | 'page' | 'faq' | 'pricing';

export interface SearchDocument {
  /** Unique identifier (e.g. tool slug, blog slug, page id) */
  id: string;
  type: SearchDocumentType;
  title: string;
  slug: string;
  url: string;
  category: string;
  /** Only set for tool documents */
  toolSlug?: string;
  description: string;
  /** Long-form body content (guide text, FAQ answer, etc.) */
  content: string;
  keywords: string[];
  aliases: string[];
  formats: string[];
  platforms: string[];
  /** Pre-built concatenation of all searchable text fields */
  searchableText: string;
  /** Relevance weight 0–1; higher = more authoritative */
  priority: number;
}

export interface SearchResult extends SearchDocument {
  /** Computed relevance score for this query */
  score: number;
  /** Which fields contributed to the score */
  matchedFields: string[];
}

export interface SearchOptions {
  /** Maximum number of results to return (default 20) */
  limit?: number;
  /** Restrict results to specific document types */
  types?: SearchDocumentType[];
  /** Fuse.js threshold for fuzzy matching (default 0.4, lower = stricter) */
  fuzzyThreshold?: number;
}
