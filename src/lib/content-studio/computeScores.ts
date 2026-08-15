import { analyzeContentJson, type TiptapNode } from './contentText';
import { analyzeSeo } from './seoAnalysis';
import { analyzeReadability } from './readability';

type ScoreInput = {
  title: string;
  seoTitle?: string | null;
  slug: string;
  excerpt?: string | null;
  metaDescription?: string | null;
  focusKeyphrase?: string | null;
  synonymsJson?: string | null;
  coverImage?: string | null;
  coverAlt?: string | null;
  canonicalUrl?: string | null;
  contentJson?: unknown;
};

function parseArray(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** Server-side scoring, run on every create/update so persisted scores match what the editor showed. */
export function computeScores(input: ScoreInput) {
  const doc = (input.contentJson ?? null) as TiptapNode | null;
  const content = analyzeContentJson(doc);

  const seo = analyzeSeo({
    title: input.title,
    seoTitle: input.seoTitle || input.title,
    slug: input.slug,
    metaDescription: input.metaDescription || input.excerpt || input.title,
    focusKeyphrase: input.focusKeyphrase || '',
    synonyms: parseArray(input.synonymsJson),
    coverImage: input.coverImage,
    coverAlt: input.coverAlt,
    canonicalUrl: input.canonicalUrl,
    content,
  });

  const readability = analyzeReadability(content);

  return {
    seoScore: seo.score,
    readabilityScore: readability.score,
    wordCount: content.wordCount,
  };
}
