/**
 * Search index builder for the SavDown search engine.
 *
 * Builds a normalized SearchDocument array from ALL static config sources.
 * Adding a new tool to config/catalog.ts automatically makes it searchable —
 * no manual updates needed here.
 *
 * Data sources:
 *   - config/catalog.ts  — all 59 tools (PRIMARY source of truth)
 *   - config/tools.ts    — downloader registry (formats, platforms, FAQ text)
 *   - config/functionalToolContent.ts — FAQ for image/video/PDF/utility tools
 *   - config/toolContent.ts — deep SEO guides for downloaders
 *   - config/blog.ts     — blog posts
 *   - config/pricing.ts  — pricing/plans page
 *   - config/faqs.ts     — site-level FAQ
 *   - config/site.ts     — site metadata
 */

import { catalog } from '@/config/catalog';
import { toolsBySlug } from '@/config/tools';
import { functionalToolContent } from '@/config/functionalToolContent';
import { toolContent } from '@/config/toolContent';
import { blogPosts } from '@/config/blog';
import { DEFAULT_PRICING } from '@/config/pricing';
import { homeFaqs } from '@/config/faqs';
import { siteConfig } from '@/config/site';
import type { SearchDocument } from './types';
import { getToolAliases } from './synonyms';
import { normalizeText } from './normalizer';

// ── Module-level cache (built once, reused) ──────────────────────────────────

let _index: SearchDocument[] | null = null;

// ── Static pages to always include in the index ──────────────────────────────

const STATIC_PAGES: Array<{
  id: string;
  title: string;
  url: string;
  description: string;
  keywords: string[];
  category: string;
}> = [
  { id: 'page-about', title: 'About SavDown', url: '/about', description: 'Who we are and what we stand for.', keywords: ['about', 'company', 'team', 'savdown'], category: 'Company' },
  { id: 'page-blog', title: 'Blog', url: '/blog', description: 'Guides and stories on downloading media.', keywords: ['blog', 'articles', 'guides'], category: 'Content' },
  { id: 'page-faq', title: 'FAQ', url: '/faq', description: 'Common questions and answers.', keywords: ['faq', 'help', 'questions', 'answers'], category: 'Support' },
  { id: 'page-contact', title: 'Contact Us', url: '/contact', description: 'Get in touch with the SavDown team.', keywords: ['contact', 'email', 'support', 'help'], category: 'Support' },
  { id: 'page-privacy', title: 'Privacy Policy', url: '/privacy', description: 'How we handle your data.', keywords: ['privacy', 'gdpr', 'data', 'policy'], category: 'Legal' },
  { id: 'page-terms', title: 'Terms of Service', url: '/terms', description: 'The terms of using SavDown.', keywords: ['terms', 'legal', 'terms of service'], category: 'Legal' },
  { id: 'page-cookies', title: 'Cookie Disclaimer', url: '/cookies', description: 'How we use cookies.', keywords: ['cookies', 'cookie policy'], category: 'Legal' },
  { id: 'page-dmca', title: 'DMCA', url: '/dmca', description: 'Copyright takedown policy.', keywords: ['dmca', 'copyright', 'takedown'], category: 'Legal' },
];

// ── Builders ──────────────────────────────────────────────────────────────────

function buildToolDocuments(): SearchDocument[] {
  const docs: SearchDocument[] = [];

  for (const tool of catalog) {
    const slug = tool.slug;
    const url = `/tools/${slug}`;

    // Pull extra data from the downloader registry if available
    const downloaderTool = toolsBySlug.get(slug);
    const funcContent = functionalToolContent[slug];
    const guideContent = toolContent[slug];

    // Collect formats and platforms
    const formats: string[] = downloaderTool?.supportedFormats ?? [];
    const platforms: string[] = downloaderTool?.platform ? [downloaderTool.platform] : [];

    // Collect keywords from all sources
    const keywords: string[] = [...(tool.keywords ?? [])];

    // Add FAQ question texts as additional keywords (downloaders)
    if (downloaderTool?.faq) {
      for (const faqItem of downloaderTool.faq) {
        // Add just the first few words of each question as keyword hints
        const words = faqItem.question.split(/\s+/).slice(0, 6).join(' ').toLowerCase();
        keywords.push(words);
      }
    }

    // Add FAQ question texts from functional tool content
    if (funcContent?.faq) {
      for (const faqItem of funcContent.faq) {
        const words = faqItem.question.split(/\s+/).slice(0, 6).join(' ').toLowerCase();
        keywords.push(words);
      }
    }

    // Add key phrases from tool guide content
    if (guideContent) {
      if (guideContent.supportedPlatforms.length) {
        platforms.push(...guideContent.supportedPlatforms);
      }
    }

    // Generate rich alias set from the slug
    const aliases = getToolAliases(slug);

    // Also add the tool name and its lowercase/hyphen variants
    aliases.push(tool.name.toLowerCase());
    aliases.push(tool.name.toLowerCase().replace(/\s+/g, '-'));

    // Build searchable text: all fields concatenated for fast substring scanning
    const searchableText = normalizeText(
      [
        tool.name,
        ...aliases,
        tool.description,
        ...keywords,
        tool.group,
        ...formats,
        ...platforms,
        slug.replace(/-/g, ' '),
      ].join(' ')
    );

    docs.push({
      id: `tool-${slug}`,
      type: 'tool',
      title: tool.name,
      slug,
      url,
      category: tool.group,
      toolSlug: slug,
      description: tool.description,
      content: [
        tool.description,
        guideContent?.introduction ?? '',
        guideContent?.whatItDoes ?? '',
      ].filter(Boolean).join(' '),
      keywords,
      aliases,
      formats,
      platforms,
      searchableText,
      priority: 1.0,
    });
  }

  return docs;
}

function buildBlogDocuments(): SearchDocument[] {
  return blogPosts.map((post) => {
    const keywords = [
      post.primaryKeyword,
      ...post.secondaryKeywords,
      ...post.tags,
    ];

    // Include FAQ questions from structured blog content
    if (post.faqItems) {
      for (const item of post.faqItems) {
        keywords.push(item.question.split(/\s+/).slice(0, 6).join(' ').toLowerCase());
      }
    }

    const searchableText = normalizeText(
      [post.title, post.excerpt, post.category, ...keywords].join(' ')
    );

    return {
      id: `blog-${post.slug}`,
      type: 'blog' as const,
      title: post.title,
      slug: post.slug,
      url: `/blog/${post.slug}`,
      category: post.category,
      toolSlug: post.toolSlug,
      description: post.excerpt,
      content: post.excerpt,
      keywords,
      aliases: [],
      formats: [],
      platforms: [],
      searchableText,
      priority: 0.6,
    };
  });
}

function buildPricingDocument(): SearchDocument {
  const keywords = [
    'pricing',
    'plans',
    'credits',
    'savcredits',
    'cost',
    'free',
    'pro',
    'lifetime',
    'subscription',
    'upgrade',
    'payment',
    'monthly',
    'yearly',
    'annual',
    'how many credits',
    'what plans',
    'how much does savdown cost',
    'is savdown free',
  ];

  // Pull plan names from DEFAULT_PRICING if available
  if (DEFAULT_PRICING?.plans) {
    for (const plan of DEFAULT_PRICING.plans) {
      if (plan.name) keywords.push(plan.name.toLowerCase());
    }
  }

  const searchableText = normalizeText(keywords.join(' '));

  return {
    id: 'page-pricing',
    type: 'pricing',
    title: 'SavDown Plans and Pricing',
    slug: 'pricing',
    url: '/pricing',
    category: 'Pricing',
    description: 'Simple credit-based plans for power users. Free daily credits, Pro monthly/yearly, and Lifetime options.',
    content: 'Pricing plans credits free pro lifetime subscription upgrade monthly yearly annual',
    keywords,
    aliases: ['how much does savdown cost', 'what plans do you have', 'how many credits do i get'],
    formats: [],
    platforms: [],
    searchableText,
    priority: 0.8,
  };
}

function buildFaqDocuments(): SearchDocument[] {
  return homeFaqs.map((faq, i) => {
    const searchableText = normalizeText(`${faq.question} ${faq.answer}`);
    return {
      id: `faq-${i}`,
      type: 'faq' as const,
      title: `FAQ: ${faq.question}`,
      slug: `faq-${i}`,
      url: '/faq',
      category: 'Support',
      description: faq.answer.slice(0, 160),
      content: faq.answer,
      keywords: ['faq', 'help', 'question'],
      aliases: [],
      formats: [],
      platforms: [],
      searchableText,
      priority: 0.7,
    };
  });
}

function buildStaticPageDocuments(): SearchDocument[] {
  const docs: SearchDocument[] = [];

  for (const page of STATIC_PAGES) {
    const searchableText = normalizeText(
      [page.title, page.description, ...page.keywords].join(' ')
    );
    docs.push({
      id: page.id,
      type: 'page',
      title: page.title,
      slug: page.id.replace('page-', ''),
      url: page.url,
      category: page.category,
      description: page.description,
      content: page.description,
      keywords: page.keywords,
      aliases: [],
      formats: [],
      platforms: [],
      searchableText,
      priority: 0.5,
    });
  }

  // Add site-level navigation pages from siteConfig
  const siteName = siteConfig.name;
  docs.push({
    id: 'page-home',
    type: 'page',
    title: `${siteName} — ${siteConfig.tagline}`,
    slug: 'home',
    url: '/',
    category: 'Site',
    description: siteConfig.description,
    content: siteConfig.description,
    keywords: [...siteConfig.keywords],
    aliases: ['home', 'main page', 'savdown'],
    formats: [],
    platforms: [],
    searchableText: normalizeText(
      [siteConfig.name, siteConfig.description, ...siteConfig.keywords].join(' ')
    ),
    priority: 0.5,
  });

  return docs;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build the complete search index from all static sources.
 * Result is memoized — subsequent calls return the cached array.
 */
export function buildSearchIndex(): SearchDocument[] {
  if (_index !== null) return _index;

  _index = [
    ...buildToolDocuments(),
    ...buildBlogDocuments(),
    buildPricingDocument(),
    ...buildFaqDocuments(),
    ...buildStaticPageDocuments(),
  ];

  return _index;
}

/**
 * Get the cached search index (builds it on first call).
 */
export function getSearchIndex(): SearchDocument[] {
  return buildSearchIndex();
}

/** Force a cache invalidation (useful in tests) */
export function invalidateSearchIndex(): void {
  _index = null;
}
