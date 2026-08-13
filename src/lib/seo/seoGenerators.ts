/**
 * Local, template-based SEO content generators. Everything here is pure
 * string logic, no network calls, no external API, no server needed.
 * Runs entirely in the browser.
 */

/* ── Meta Title Generator ─────────────────────────────────────── */

const TITLE_TEMPLATES = [
  (t: string, b: string) => `${cap(t)}${b ? ` | ${b}` : ''}`,
  (t: string, b: string) => `${cap(t)}: The Complete Guide${b ? ` | ${b}` : ''}`,
  (t: string) => `${cap(t)}, Everything You Need To Know`,
  (t: string, b: string) => `Best ${cap(t)} in ${new Date().getFullYear()}${b ? ` | ${b}` : ''}`,
  (t: string) => `How To ${cap(t)}: A Step-By-Step Guide`,
  (t: string, b: string) => `${cap(t)} Explained${b ? `, ${b}` : ''}`,
  (t: string) => `${cap(t)}: Tips, Tricks & Tools`,
  (t: string, b: string) => `${b ? `${b}: ` : ''}${cap(t)}`,
];

export function generateMetaTitles(topic: string, brand = ''): string[] {
  const t = topic.trim();
  if (!t) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const build of TITLE_TEMPLATES) {
    const title = build(t, brand.trim()).replace(/\s+/g, ' ').trim();
    if (seen.has(title)) continue;
    seen.add(title);
    out.push(title.length > 60 ? title.slice(0, 57).trimEnd() + '…' : title);
  }
  return out;
}

/* ── Meta Description Generator ───────────────────────────────── */

const DESCRIPTION_TEMPLATES = [
  (t: string, c: string) => `Discover everything about ${t}. Clear explanations, practical tips, and expert insight. ${c}`,
  (t: string, c: string) => `Looking for ${t}? This guide covers what you need to know, step by step. ${c}`,
  (t: string, c: string) => `A complete, up-to-date guide to ${t}, what it is, why it matters, and how to get started. ${c}`,
  (t: string, c: string) => `Everything you need on ${t} in one place: tips, examples, and answers to common questions. ${c}`,
  (t: string, c: string) => `Get a clear, no-fluff breakdown of ${t}. Practical advice you can use today. ${c}`,
  (t: string, c: string) => `${cap(t)}, explained simply. Learn the essentials and avoid common mistakes. ${c}`,
];

export function generateMetaDescriptions(topic: string, cta = ''): string[] {
  const t = topic.trim();
  if (!t) return [];
  const c = cta.trim();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const build of DESCRIPTION_TEMPLATES) {
    let desc = build(t, c).replace(/\s+/g, ' ').trim();
    if (desc.length > 160) desc = desc.slice(0, 157).trimEnd() + '…';
    if (seen.has(desc)) continue;
    seen.add(desc);
    out.push(desc);
  }
  return out;
}

/* ── YouTube Tags Generator ───────────────────────────────────── */

const YOUTUBE_MODIFIERS = [
  'tutorial', 'guide', 'tips', 'tips and tricks', 'for beginners', 'explained',
  'how to', 'review', 'walkthrough', 'step by step', String(new Date().getFullYear()),
  'best practices', 'quick guide', 'in depth', 'full guide', 'basics',
];

export function generateYoutubeTags(title: string): string[] {
  const t = title.trim();
  if (!t) return [];

  const words = t.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const tags = new Set<string>();

  // Whole title as one tag
  tags.add(t.toLowerCase());

  // Individual meaningful words (skip very short stopword-like tokens)
  const stopwords = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'to', 'for', 'and', 'or', 'is', 'it', 'with']);
  for (const w of words) {
    if (w.length > 2 && !stopwords.has(w)) tags.add(w);
  }

  // 2-word phrases (bigrams)
  for (let i = 0; i < words.length - 1; i++) {
    tags.add(`${words[i]} ${words[i + 1]}`);
  }

  // Title + modifier combos
  const base = words.filter(w => !stopwords.has(w)).slice(0, 4).join(' ');
  for (const mod of YOUTUBE_MODIFIERS) {
    tags.add(`${base} ${mod}`);
  }

  // YouTube's real limit is 500 characters total (including commas).
  const out: string[] = [];
  let total = 0;
  for (const tag of tags) {
    const cost = tag.length + (out.length > 0 ? 1 : 0);
    if (total + cost > 500) break;
    out.push(tag);
    total += cost;
  }
  return out;
}

/* ── Keyword Generator ────────────────────────────────────────── */

export type KeywordGroup = { intent: string; keywords: string[] };

const KEYWORD_MODIFIERS: Record<string, string[]> = {
  Informational: ['what is', 'how to', 'why', 'guide to', 'tips for', 'examples of', 'benefits of'],
  Commercial:    ['best', 'top', 'cheap', 'affordable', 'premium', 'free'],
  Comparison:    ['vs', 'alternative to', 'compared to', 'or'],
  Transactional: ['buy', 'download', 'get', 'near me', 'online', 'for sale'],
  Long_tail:     ['for beginners', 'for small business', 'step by step', `in ${new Date().getFullYear()}`, 'that actually work'],
};

export function generateKeywords(seed: string): KeywordGroup[] {
  const s = seed.trim();
  if (!s) return [];
  const groups: KeywordGroup[] = [];
  for (const [intentKey, modifiers] of Object.entries(KEYWORD_MODIFIERS)) {
    const intent = intentKey.replace('_', ' ');
    const keywords = modifiers.map(mod => {
      if (['vs', 'or'].includes(mod)) return `${s} ${mod} [alternative]`;
      if (['what is', 'how to', 'why', 'guide to', 'tips for', 'examples of', 'benefits of'].includes(mod)) {
        return `${mod} ${s}`;
      }
      return `${mod} ${s}`;
    });
    groups.push({ intent, keywords });
  }
  return groups;
}

/* ── Schema (JSON-LD) Generator ───────────────────────────────── */

export type SchemaType = 'Article' | 'Product' | 'FAQPage' | 'HowTo' | 'LocalBusiness' | 'Review';

export const SCHEMA_FIELDS: Record<SchemaType, { key: string; label: string; placeholder: string }[]> = {
  Article: [
    { key: 'headline', label: 'Headline', placeholder: 'How To Bake Sourdough Bread' },
    { key: 'author', label: 'Author Name', placeholder: 'Jane Doe' },
    { key: 'datePublished', label: 'Date Published', placeholder: '2026-08-09' },
    { key: 'image', label: 'Image URL', placeholder: 'https://example.com/image.jpg' },
  ],
  Product: [
    { key: 'name', label: 'Product Name', placeholder: 'Wireless Headphones' },
    { key: 'description', label: 'Description', placeholder: 'Noise-cancelling over-ear headphones' },
    { key: 'price', label: 'Price', placeholder: '79.99' },
    { key: 'currency', label: 'Currency', placeholder: 'USD' },
    { key: 'image', label: 'Image URL', placeholder: 'https://example.com/product.jpg' },
  ],
  FAQPage: [
    { key: 'q1', label: 'Question 1', placeholder: 'What is SavDown?' },
    { key: 'a1', label: 'Answer 1', placeholder: 'A free online tool suite.' },
    { key: 'q2', label: 'Question 2', placeholder: 'Is it free?' },
    { key: 'a2', label: 'Answer 2', placeholder: 'Yes, completely free.' },
  ],
  HowTo: [
    { key: 'name', label: 'Title', placeholder: 'How To Reset A Router' },
    { key: 'step1', label: 'Step 1', placeholder: 'Unplug the router.' },
    { key: 'step2', label: 'Step 2', placeholder: 'Wait 10 seconds.' },
    { key: 'step3', label: 'Step 3', placeholder: 'Plug it back in.' },
  ],
  LocalBusiness: [
    { key: 'name', label: 'Business Name', placeholder: 'Acme Coffee Shop' },
    { key: 'address', label: 'Street Address', placeholder: '123 Main St' },
    { key: 'city', label: 'City', placeholder: 'Springfield' },
    { key: 'phone', label: 'Phone', placeholder: '+1-555-0100' },
  ],
  Review: [
    { key: 'itemName', label: 'Item Reviewed', placeholder: 'The Great Gatsby' },
    { key: 'author', label: 'Reviewer Name', placeholder: 'Jane Doe' },
    { key: 'ratingValue', label: 'Rating (1-5)', placeholder: '5' },
    { key: 'reviewBody', label: 'Review Text', placeholder: 'A timeless classic.' },
  ],
};

export function generateSchema(type: SchemaType, fields: Record<string, string>): string {
  let schema: Record<string, unknown>;

  switch (type) {
    case 'Article':
      schema = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: fields.headline || '',
        author: { '@type': 'Person', name: fields.author || '' },
        datePublished: fields.datePublished || '',
        image: fields.image || '',
      };
      break;
    case 'Product':
      schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: fields.name || '',
        description: fields.description || '',
        image: fields.image || '',
        offers: {
          '@type': 'Offer',
          price: fields.price || '',
          priceCurrency: fields.currency || 'USD',
        },
      };
      break;
    case 'FAQPage':
      schema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          fields.q1 ? { '@type': 'Question', name: fields.q1, acceptedAnswer: { '@type': 'Answer', text: fields.a1 || '' } } : null,
          fields.q2 ? { '@type': 'Question', name: fields.q2, acceptedAnswer: { '@type': 'Answer', text: fields.a2 || '' } } : null,
        ].filter(Boolean),
      };
      break;
    case 'HowTo':
      schema = {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: fields.name || '',
        step: [fields.step1, fields.step2, fields.step3]
          .filter(Boolean)
          .map(text => ({ '@type': 'HowToStep', text })),
      };
      break;
    case 'LocalBusiness':
      schema = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: fields.name || '',
        address: {
          '@type': 'PostalAddress',
          streetAddress: fields.address || '',
          addressLocality: fields.city || '',
        },
        telephone: fields.phone || '',
      };
      break;
    case 'Review':
      schema = {
        '@context': 'https://schema.org',
        '@type': 'Review',
        itemReviewed: { '@type': 'Thing', name: fields.itemName || '' },
        author: { '@type': 'Person', name: fields.author || '' },
        reviewRating: { '@type': 'Rating', ratingValue: fields.ratingValue || '' },
        reviewBody: fields.reviewBody || '',
      };
      break;
  }

  return JSON.stringify(schema, null, 2);
}

/* ── shared helpers ────────────────────────────────────────────── */

function cap(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}
