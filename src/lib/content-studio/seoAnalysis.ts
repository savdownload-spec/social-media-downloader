import type { ContentAnalysis } from './contentText';

export type CheckStatus = 'good' | 'improvement' | 'problem';

export type SeoCheck = {
  id: string;
  status: CheckStatus;
  message: string;
};

export type SeoAnalysisInput = {
  title: string;
  seoTitle: string;
  slug: string;
  metaDescription: string;
  focusKeyphrase: string;
  synonyms: string[];
  coverImage: string | null | undefined;
  coverAlt: string | null | undefined;
  canonicalUrl: string | null | undefined;
  content: ContentAnalysis;
};

export type SeoAnalysisResult = {
  score: number;
  problems: SeoCheck[];
  improvements: SeoCheck[];
  good: SeoCheck[];
  all: SeoCheck[];
};

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  return (haystack.match(re) || []).length;
}

function keyphraseVariants(focusKeyphrase: string, synonyms: string[]): string[] {
  return [focusKeyphrase, ...synonyms].map((s) => s.trim()).filter(Boolean);
}

function containsAny(haystack: string, variants: string[]): boolean {
  return variants.some((v) => countOccurrences(haystack, v) > 0);
}

/**
 * Natural-language SEO analysis, deliberately modeled on Yoast's checklist
 * (title/meta/slug/headings/body placement + distribution + stuffing, link
 * and image coverage) but presented as an in-house "SavDown SEO Score" —
 * never framed as a Google ranking signal.
 */
export function analyzeSeo(input: SeoAnalysisInput): SeoAnalysisResult {
  const checks: SeoCheck[] = [];
  const push = (id: string, status: CheckStatus, message: string) =>
    checks.push({ id, status, message });

  const seoTitle = input.seoTitle || input.title;
  const metaDescription = input.metaDescription;
  const variants = keyphraseVariants(input.focusKeyphrase, input.synonyms);
  const hasKeyphrase = variants.length > 0;
  const { plainText, wordCount, headings, images, internalLinks, externalLinks } = input.content;
  const intro = input.content.paragraphTexts.slice(0, 1).join(' ');

  // SEO title
  if (!seoTitle) {
    push('seo-title', 'problem', 'No SEO title set. Add one — it becomes the clickable headline in search results.');
  } else if (seoTitle.length > 60) {
    push('seo-title-length', 'improvement', `Your SEO title is ${seoTitle.length} characters. Google typically truncates titles over 60 — trim it for a cleaner snippet.`);
  } else if (seoTitle.length < 30) {
    push('seo-title-length', 'improvement', `Your SEO title is only ${seoTitle.length} characters. A more descriptive title (up to ~60) usually earns more clicks.`);
  } else {
    push('seo-title-length', 'good', 'Your SEO title has a good length.');
  }

  // Meta description
  if (!metaDescription) {
    push('meta-description', 'problem', 'No meta description set. Search engines may generate one for you, which you can\'t control — write your own.');
  } else if (metaDescription.length > 156) {
    push('meta-description-length', 'improvement', `Your meta description is ${metaDescription.length} characters and will likely be truncated. Aim for 120–156.`);
  } else if (metaDescription.length < 80) {
    push('meta-description-length', 'improvement', `Your meta description is only ${metaDescription.length} characters. Use the space to summarize the article and include your keyphrase.`);
  } else {
    push('meta-description-length', 'good', 'Your meta description has a good length.');
  }

  // Slug / URL
  const slugWords = input.slug.split('-').filter(Boolean);
  if (input.slug.length > 75) {
    push('slug-length', 'improvement', 'Your URL slug is quite long. Shorter, focused URLs are easier to read and share.');
  } else if (slugWords.length < 2) {
    push('slug-length', 'improvement', 'Your URL slug is very short — make sure it still describes the topic clearly.');
  } else {
    push('slug-length', 'good', 'Your URL is a reasonable length.');
  }

  // Featured image
  if (!input.coverImage) {
    push('featured-image', 'problem', 'No featured image set. Add one — it\'s used on blog cards, the article page, and social previews.');
  } else if (!input.coverAlt) {
    push('featured-image-alt', 'improvement', 'Your featured image is missing alt text. Add a short description for accessibility and image search.');
  } else {
    push('featured-image', 'good', 'A featured image with alt text is set.');
  }

  // Canonical
  push('canonical', 'good', input.canonicalUrl ? 'A custom canonical URL is set.' : 'Canonical URL defaults to this article\'s own URL — that\'s correct for normal posts.');

  // Word count
  if (wordCount < 300) {
    push('word-count', 'problem', `Your content is ${wordCount} words. Thin content (under 300 words) is hard to rank — expand on the topic.`);
  } else if (wordCount < 600) {
    push('word-count', 'improvement', `Your content is ${wordCount} words. Consider adding more depth if the topic supports it.`);
  } else {
    push('word-count', 'good', `Your content is ${wordCount} words — a solid length.`);
  }

  // Heading structure
  if (headings.length === 0 && wordCount > 300) {
    push('heading-structure', 'improvement', 'No subheadings found. Break up longer content with H2/H3 headings for readability and scannability.');
  } else {
    push('heading-structure', 'good', headings.length ? `Your content uses ${headings.length} subheading(s).` : 'Short content doesn\'t need subheadings.');
  }

  // Links
  if (internalLinks === 0) {
    push('internal-links', 'improvement', 'No internal links found. Link to a relevant tool or another article — use the Internal Linking panel below.');
  } else {
    push('internal-links', 'good', `Your content links to ${internalLinks} internal page(s).`);
  }
  if (externalLinks === 0) {
    push('external-links', 'improvement', 'No external links found. Linking to a credible outside source can support your content.');
  } else {
    push('external-links', 'good', 'Your content links to at least one external source.');
  }

  // Image alt coverage
  if (images.length > 0) {
    const missingAlt = images.filter((i) => !i.hasAlt).length;
    if (missingAlt > 0) {
      push('image-alt', 'problem', `${missingAlt} of ${images.length} image(s) in your content are missing alt text. Add descriptive alt text to every image.`);
    } else {
      push('image-alt', 'good', 'All images in your content have alt text.');
    }
  }

  // Keyphrase-specific checks
  if (!hasKeyphrase) {
    push('focus-keyphrase', 'improvement', 'No focus keyphrase set. Add one to unlock keyword placement and distribution analysis.');
  } else {
    const kp = input.focusKeyphrase;

    push('keyphrase-title', containsAny(seoTitle, variants) ? 'good' : 'problem',
      containsAny(seoTitle, variants)
        ? 'Your focus keyphrase appears in the SEO title.'
        : `Your focus keyphrase "${kp}" doesn't appear in the SEO title. Try to include it naturally.`);

    push('keyphrase-intro', containsAny(intro, variants) ? 'good' : 'improvement',
      containsAny(intro, variants)
        ? 'Your focus keyphrase appears in the introduction.'
        : 'Your focus keyphrase doesn\'t appear in the first paragraph — readers (and search engines) look there first.');

    push('keyphrase-slug', containsAny(input.slug.replace(/-/g, ' '), variants) ? 'good' : 'improvement',
      containsAny(input.slug.replace(/-/g, ' '), variants)
        ? 'Your focus keyphrase appears in the URL slug.'
        : 'Your focus keyphrase doesn\'t appear in the URL slug.');

    push('keyphrase-meta', containsAny(metaDescription, variants) ? 'good' : 'improvement',
      containsAny(metaDescription, variants)
        ? 'Your focus keyphrase appears in the meta description.'
        : 'Your focus keyphrase doesn\'t appear in the meta description.');

    push('keyphrase-heading', containsAny(headings.map((h) => h.text).join(' '), variants) ? 'good' : 'improvement',
      containsAny(headings.map((h) => h.text).join(' '), variants)
        ? 'Your focus keyphrase appears in at least one subheading.'
        : 'Your focus keyphrase doesn\'t appear in any subheading.');

    // Density + distribution + stuffing
    const occurrences = variants.reduce((sum, v) => sum + countOccurrences(plainText, v), 0);
    const density = wordCount > 0 ? (occurrences / wordCount) * 100 : 0;
    const paragraphsWithKeyphrase = input.content.paragraphTexts.filter((p) => containsAny(p, variants)).length;
    const paragraphCoverage = input.content.paragraphTexts.length > 0
      ? paragraphsWithKeyphrase / input.content.paragraphTexts.length
      : 0;

    if (occurrences === 0) {
      push('keyphrase-density', 'problem', 'Your focus keyphrase doesn\'t appear in the body content at all.');
    } else if (density > 3) {
      push('keyphrase-density', 'problem', `Your focus keyphrase appears ${occurrences} times (${density.toFixed(1)}% density) — that reads as keyword stuffing. Remove some repetitions and write naturally.`);
    } else if (density < 0.3) {
      push('keyphrase-density', 'improvement', 'Your focus keyphrase is used sparingly. A few more natural mentions would help — don\'t force it.');
    } else {
      push('keyphrase-density', 'good', `Your focus keyphrase density (${density.toFixed(1)}%) is natural.`);
    }

    if (input.content.paragraphTexts.length > 3) {
      if (paragraphCoverage < 0.15 && occurrences > 0) {
        push('keyphrase-distribution', 'improvement', 'Uneven distribution — some parts of your text don\'t contain the keyphrase or its synonyms. Spread mentions more evenly.');
      } else if (occurrences > 0) {
        push('keyphrase-distribution', 'good', 'Your focus keyphrase is distributed evenly throughout the text.');
      }
    }
  }

  const weight = (s: CheckStatus) => (s === 'good' ? 1 : s === 'improvement' ? 0.5 : 0);
  const score = checks.length
    ? Math.round((checks.reduce((sum, c) => sum + weight(c.status), 0) / checks.length) * 100)
    : 0;

  return {
    score,
    problems: checks.filter((c) => c.status === 'problem'),
    improvements: checks.filter((c) => c.status === 'improvement'),
    good: checks.filter((c) => c.status === 'good'),
    all: checks,
  };
}
