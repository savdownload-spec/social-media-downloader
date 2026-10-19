/**
 * SavDown-wide support knowledge engine.
 *
 * The corpus is DERIVED — never hand-maintained per tool — from the
 * same source-of-truth systems that power the public site:
 *
 *   config/tools.ts                  downloader registry (FAQ, how-to, formats, keywords)
 *   config/catalog.ts                the 7-group tool catalog (every tool's identity)
 *   config/functionalTools.ts        which tools are live vs "coming soon"
 *   config/functionalToolContent.ts  how-to + FAQ for live non-downloader tools
 *   config/toolContent.ts            deep guides for downloaders
 *   config/faqs.ts                 site-level FAQ
 *   config/blog.ts                 blog articles (excerpt, FAQ items, how-to steps)
 *   config/site.ts                 site navigation / policy pages
 *   lib/pdfConfig.ts               real PDF limits (50 MB / 150 MB / 10 files / 500 pages)
 *
 * Adding a tool only requires adding it to the catalog (plus its normal
 * content files). It automatically becomes answerable here — no per-tool
 * code, no special cases, no category-specific branches anywhere in the
 * support pipeline.
 *
 * Dynamic content (live pricing, AI-image limits, credit costs, DB blog
 * posts) is merged per request by the API route via the pure builders
 * exported at the bottom of this file, so an admin edit takes effect
 * without a code change.
 */

import { tools, toolsBySlug } from '@/config/tools';
import {
  catalog,
  toolGroups,
  groupBlurb,
  groupSlug,
  isToolAvailable,
  type CatalogTool,
} from '@/config/catalog';
import { toolContent } from '@/config/toolContent';
import { functionalToolContent } from '@/config/functionalToolContent';
import { homeFaqs } from '@/config/faqs';
import { blogPosts, type BlogPost } from '@/config/blog';
import { siteConfig } from '@/config/site';
import {
  PDF_MAX_FILE_BYTES,
  PDF_MAX_BATCH_BYTES,
  PDF_MAX_BATCH_FILES,
  PDF_MAX_PAGES,
} from '@/lib/pdfConfig';
import { activePromotion, type PricingConfig } from '@/config/pricing';
import type { AiImageConfig } from '@/config/aiImage';
import { detectIntent, type SupportIntent } from './support-nlp';

// ── Document model ─────────────────────────────────────────────

/** SavDown product taxonomy. Every tool category plus every site area. */
export type KnowledgeCategory =
  | 'downloaders'
  | 'image'
  | 'video'
  | 'pdf'
  | 'ai'
  | 'seo'
  | 'utility'
  | 'pricing'
  | 'credits'
  | 'billing'
  | 'account'
  | 'workspace'
  | 'support'
  | 'policy'
  | 'site'
  | 'blog';

export type KnowledgeSourceType =
  | 'tool'
  | 'tool-faq'
  | 'tool-guide'
  | 'category'
  | 'site-faq'
  | 'pricing'
  | 'page'
  | 'workspace'
  | 'blog'
  | 'config';

export type KnowledgeDocument = {
  id: string;
  title: string;
  body: string;
  url?: string;
  sourceType: KnowledgeSourceType;
  category: KnowledgeCategory;
  /** What this document is about: a tool, a category, a product area, … */
  entityType: 'tool' | 'category' | 'area' | 'page' | 'article' | 'faq' | 'policy';
  /** Tool slug, category name, or area id — the retrieval join key. */
  entityId: string;
  toolSlug?: string;
  /** Intents this document can serve — drives intent-aware retrieval. */
  intents: SupportIntent[];
  /** Base relevance weight (0–1). Higher = more authoritative. */
  priority: number;
  /** 'current' = canonical product content; 'supplementary' = blog/excerpts. */
  status: 'current' | 'supplementary';
  language: string;
  updatedAt: string;
  keywords: string[];
};

// ── Tokenizer (shared by retrieval, entity resolution, tests) ────

const STOP_WORDS = new Set([
  'a','an','the','is','it','in','on','to','for','of','and','or','be','at','by','as',
  'do','we','my','me','so','if','no','up','can','has','how','its','was','are','our',
  'not','with','this','that','from','they','will','have','just','than','then','you',
  'your','what','when','why','where','which','who','been','would','could','should',
  'i','am','get','got','use','used','using','see','did','does','any','all','let',
  'please','tell','want','need','know','about','into','out','very','much','many',
  'there','here','them','they','their','its','him','her','his','she','he','but',
]);

/**
 * Light stemmer: plurals plus common suffixes, so "downloads",
 * "downloader" and "downloading" all match "download".
 */
export function stem(token: string): string {
  let s = token;
  if (s.length > 5 && s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith('ed')) s = s.slice(0, -2);
  if (s.length > 4 && s.endsWith('er')) s = s.slice(0, -2);
  else if (s.length > 4 && s.endsWith('or')) s = s.slice(0, -2);
  if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  return s;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
    .map(stem);
}

/** Prefix-tolerant token equality: "convert" ≈ "converter", "upscale" ≈ "upscal". */
function tokenEq(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return shorter.length >= 5 && longer.startsWith(shorter);
}

// ── Synonyms (generic vocabulary expansion) ──────────────────────

const SYNONYMS: Record<string, string[]> = {
  credits: ['savcredits', 'credit', 'coin', 'balance', 'allowance'],
  download: ['save', 'saving', 'grab', 'fetch', 'export'],
  merge: ['combine', 'join', 'concatenate'],
  compress: ['shrink', 'reduce', 'smaller', 'optimize', 'compression'],
  convert: ['change', 'transform', 'turn', 'export'],
  pdf: ['document', 'doc'],
  video: ['clip', 'film', 'footage', 'mp4'],
  image: ['photo', 'picture', 'jpeg', 'jpg', 'png', 'img'],
  youtube: ['yt', 'ytb'],
  instagram: ['ig', 'insta'],
  facebook: ['fb'],
  twitter: ['tweet'],
  login: ['signin', 'log'],
  password: ['passwd', 'pw'],
  plan: ['subscription', 'tier', 'membership', 'upgrade'],
  batch: ['bulk', 'multiple', 'queue'],
  error: ['fail', 'failing', 'failed', 'broken', 'wrong'],
  troubleshoot: ['fix', 'solve', 'debug', 'repair'],
  watermark: ['logo', 'stamp', 'overlay'],
  quality: ['resolution', 'hd', '4k', '1080p', '720p'],
  split: ['separate', 'divide', 'extract'],
  word: ['docx', 'microsoft'],
  seo: ['search', 'optimization', 'rank', 'meta', 'keyword'],
  collection: ['folder', 'organize', 'group'],
  billing: ['invoice', 'payment', 'charge', 'refund', 'checkout', 'card'],
  install: ['pwa', 'app', 'homescreen'],
  background: ['bg', 'remove'],
  upscale: ['enlarge', 'bigger', 'enhance', 'resolution'],
};

/** All synonym expansions for one token (including the token itself). */
function synonymSet(token: string): string[] {
  const out = new Set<string>([token]);
  for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
    if (aliases.includes(token)) out.add(canonical);
    if (token === canonical) aliases.forEach((a) => out.add(a));
  }
  return [...out];
}

// ── Corpus cache ───────────────────────────────────────────────

let _corpus: KnowledgeDocument[] | null = null;

/** Force a corpus rebuild (dev tooling, admin content edits). */
export function invalidateCorpus(): void {
  _corpus = null;
  _entityIndex = null;
  _idf = null;
}

const NOW = new Date().toISOString();

function intentsFor(text: string): SupportIntent[] {
  const intents = new Set<SupportIntent>([detectIntent(text)]);
  if (/^how (do|does|can|to)\b/i.test(text)) intents.add('how_to');
  if (/format|file type/i.test(text)) intents.add('supported_formats');
  if (/limit|how many|how much|maximum|size/i.test(text)) intents.add('limits');
  if (/credit|cost|price|free/i.test(text)) intents.add('credits');
  if (/fail|not working|error|problem|issue/i.test(text)) intents.add('troubleshooting');
  intents.delete('unknown');
  return [...intents];
}

function doc(partial: Omit<KnowledgeDocument, 'language' | 'updatedAt' | 'status' | 'keywords'> & Partial<Pick<KnowledgeDocument, 'language' | 'updatedAt' | 'status' | 'keywords'>>): KnowledgeDocument {
  return {
    language: 'en',
    updatedAt: NOW,
    status: 'current',
    keywords: [],
    ...partial,
  };
}

// ── Corpus builders ────────────────────────────────────────────

function categoryDocs(): KnowledgeDocument[] {
  const docs: KnowledgeDocument[] = [];

  // One overview doc per catalog group, generated from the catalog itself.
  for (const group of toolGroups) {
    const cat = groupSlug(group) as KnowledgeCategory;
    const items = catalog.filter((t) => t.group === group);
    const list = items
      .map((t) => `• ${t.name} — ${t.description}`)
      .join('\n');
    docs.push(
      doc({
        id: `category-${cat}`,
        title: `SavDown ${group} Tools`,
        body: `${groupBlurb[group]}\n\nAvailable ${group} tools on SavDown:\n${list}`,
        url: `/tools#${cat}`,
        sourceType: 'category',
        category: cat,
        entityType: 'category',
        entityId: cat,
        intents: ['tool_discovery', 'what_is', 'supported_platforms'],
        priority: 0.9,
        keywords: [group.toLowerCase(), `${group.toLowerCase()} tools`, ...items.flatMap((t) => t.keywords ?? [])],
      }),
    );
  }

  // Whole-catalog overview.
  const groupLines = toolGroups
    .map((g) => `• ${g} — ${groupBlurb[g]}`)
    .join('\n');
  docs.push(
    doc({
      id: 'category-all-tools',
      title: 'All SavDown Tools',
      body: `SavDown is a free, web-based toolkit with no install required. Every tool runs in your browser, with free daily credits and no watermarks.\n\nTools by category:\n${groupLines}`,
      url: '/tools',
      sourceType: 'category',
      category: 'site',
      entityType: 'category',
      entityId: 'tools-discovery',
      intents: ['tool_discovery', 'what_is', 'capabilities'],
      priority: 0.92,
      keywords: ['all tools', 'tool list', 'every tool', 'tool catalog', 'what tools'],
    }),
  );

  return docs;
}

function toolDocs(): KnowledgeDocument[] {
  const docs: KnowledgeDocument[] = [];

  for (const tool of catalog) {
    const url = `/tools/${tool.slug}`;
    const available = isToolAvailable(tool.slug);
    const availability = available
      ? 'It is live and ready to use.'
      : 'It is currently rolling out (marked "Coming Soon" on the tool page).';

    // Discovery doc — the tool's identity, from the catalog.
    docs.push(
      doc({
        id: `tool-${tool.slug}`,
        title: tool.name,
        body: `${tool.description} ${availability} Open it at savdown.com${url}.`,
        url,
        sourceType: 'tool',
        category: groupSlug(tool.group) as KnowledgeCategory,
        entityType: 'tool',
        entityId: tool.slug,
        toolSlug: tool.slug,
        intents: ['what_is', 'tool_discovery', 'feature'],
        priority: 0.85,
        keywords: [tool.name, tool.slug.replace(/-/g, ' '), ...(tool.keywords ?? [])],
      }),
    );

    const guide = toolContent[tool.slug];
    if (guide) {
      docs.push(
        doc({
          id: `guide-intro-${tool.slug}`,
          title: `${tool.name} Guide — What It Does and How It Works`,
          body: `${guide.whatItDoes} ${guide.introduction}`.slice(0, 700),
          url,
          sourceType: 'tool-guide',
          category: groupSlug(tool.group) as KnowledgeCategory,
          entityType: 'tool',
          entityId: tool.slug,
          toolSlug: tool.slug,
          intents: ['what_is', 'feature', 'how_to'],
          priority: 0.82,
          keywords: [tool.name],
        }),
      );
      if (guide.supportedPlatforms.length) {
        docs.push(
          doc({
            id: `guide-platforms-${tool.slug}`,
            title: `${tool.name} Supported Formats and Platforms`,
            body: `Supported by ${tool.name}: ${guide.supportedPlatforms.join(', ')}.`,
            url,
            sourceType: 'tool-guide',
            category: groupSlug(tool.group) as KnowledgeCategory,
            entityType: 'tool',
            entityId: tool.slug,
            toolSlug: tool.slug,
            intents: ['supported_formats', 'supported_platforms', 'limits'],
            priority: 0.8,
            keywords: [tool.name, 'formats', 'platforms'],
          }),
        );
      }
      if (guide.bestPractices.length) {
        docs.push(
          doc({
            id: `guide-tips-${tool.slug}`,
            title: `${tool.name} Tips and Best Practices`,
            body: guide.bestPractices.slice(0, 5).join(' ').slice(0, 600),
            url,
            sourceType: 'tool-guide',
            category: groupSlug(tool.group) as KnowledgeCategory,
            entityType: 'tool',
            entityId: tool.slug,
            toolSlug: tool.slug,
            intents: ['how_to', 'feature'],
            priority: 0.7,
            status: 'supplementary',
            keywords: [tool.name],
          }),
        );
      }
    }
  }

  // Downloader registry: how-to steps, FAQs, and real format lists.
  for (const tool of tools) {
    const url = `/tools/${tool.slug}`;
    const name = tool.name;

    if (tool.howTo.length) {
      const steps = tool.howTo
        .map((s, i) => `${i + 1}. ${s.title} — ${s.body}`)
        .join('\n');
      docs.push(
        doc({
          id: `howto-${tool.slug}`,
          title: `How to Use ${name} — Step by Step`,
          body: `How to use ${name} on SavDown:\n${steps}\nOpen ${name} at savdown.com${url}.`,
          url,
          sourceType: 'tool-guide',
          category: 'downloaders',
          entityType: 'tool',
          entityId: tool.slug,
          toolSlug: tool.slug,
          intents: ['how_to', 'what_is'],
          priority: 0.98,
          keywords: [name, 'how to', 'steps'],
        }),
      );
    }

    for (const faq of tool.faq) {
      docs.push(
        doc({
          id: `faq-${tool.slug}-${faq.question.slice(0, 40).replace(/\s+/g, '-').toLowerCase()}`,
          title: `${name}: ${faq.question}`,
          body: faq.answer,
          url,
          sourceType: 'tool-faq',
          category: 'downloaders',
          entityType: 'faq',
          entityId: tool.slug,
          toolSlug: tool.slug,
          intents: intentsFor(faq.question),
          priority: 0.96,
          keywords: [name],
        }),
      );
    }

    if (tool.supportedFormats.length) {
      docs.push(
        doc({
          id: `formats-${tool.slug}`,
          title: `${name} Supported Formats and Resolutions`,
          body: `${name} supports: ${tool.supportedFormats.join(', ')}.`,
          url,
          sourceType: 'tool-guide',
          category: 'downloaders',
          entityType: 'tool',
          entityId: tool.slug,
          toolSlug: tool.slug,
          intents: ['supported_formats', 'supported_platforms', 'limits'],
          priority: 0.9,
          keywords: [name, 'formats', 'resolution'],
        }),
      );
    }
  }

  // Functional tool content: how-to steps and FAQs for every live
  // non-downloader tool. The title and body always carry the tool
  // name and URL, so shared step templates stay distinguishable.
  for (const [slug, content] of Object.entries(functionalToolContent)) {
    const entry = catalog.find((t) => t.slug === slug);
    const name = entry?.name ?? slug;
    const group = entry ? groupSlug(entry.group) : 'utility';
    const url = `/tools/${slug}`;

    if (content.howTo.length) {
      const steps = content.howTo
        .map((s, i) => `${i + 1}. ${s.title} — ${s.body}`)
        .join('\n');
      docs.push(
        doc({
          id: `howto-${slug}`,
          title: `How to Use ${name} — Step by Step`,
          body: `How to use ${name} on SavDown:\n${steps}\nOpen ${name} at savdown.com${url}.`,
          url,
          sourceType: 'tool-guide',
          category: group as KnowledgeCategory,
          entityType: 'tool',
          entityId: slug,
          toolSlug: slug,
          intents: ['how_to'],
          priority: 0.98,
          keywords: [name, 'how to', 'steps'],
        }),
      );
    }

    for (const faq of content.faq) {
      docs.push(
        doc({
          id: `faq-${slug}-${faq.question.slice(0, 40).replace(/\s+/g, '-').toLowerCase()}`,
          title: `${name}: ${faq.question}`,
          body: faq.answer,
          url,
          sourceType: 'tool-faq',
          category: group as KnowledgeCategory,
          entityType: 'faq',
          entityId: slug,
          toolSlug: slug,
          intents: intentsFor(faq.question),
          priority: 0.96,
          keywords: [name],
        }),
      );
    }
  }

  return docs;
}

function siteDocs(): KnowledgeDocument[] {
  const docs: KnowledgeDocument[] = [];

  // Site-level FAQ.
  for (const faq of homeFaqs) {
    docs.push(
      doc({
        id: `site-faq-${faq.question.slice(0, 40).replace(/\s+/g, '-').toLowerCase()}`,
        title: `SavDown FAQ: ${faq.question}`,
        body: faq.answer,
        url: '/faq',
        sourceType: 'site-faq',
        category: 'site',
        entityType: 'faq',
        entityId: 'site-faq',
        intents: intentsFor(faq.question),
        priority: 0.92,
        keywords: ['faq'],
      }),
    );
  }

  const page = (
    id: string,
    title: string,
    body: string,
    url: string,
    category: KnowledgeCategory,
    entityId: string,
    entityType: KnowledgeDocument['entityType'],
    intents: SupportIntent[],
    priority: number,
    keywords: string[] = [],
  ) =>
    docs.push(
      doc({
        id,
        title,
        body,
        url,
        sourceType: 'page',
        category,
        entityType,
        entityId,
        intents,
        priority,
        keywords,
      }),
    );

  page(
    'page-about',
    'What Is SavDown',
    `${siteConfig.description} SavDown is web-first — no install needed, and it works on any modern browser, mobile or desktop. It includes downloaders for YouTube, TikTok, Instagram, Facebook, Pinterest, and X, plus image, video, PDF, AI, SEO, and utility tools.`,
    '/about',
    'site',
    'about',
    'page',
    ['what_is', 'capabilities', 'feature'],
    0.88,
    ['savdown', 'about', 'overview'],
  );

  page(
    'page-privacy',
    'Privacy — Does SavDown Store Downloads',
    'SavDown does not store the files you download. Media streams directly to your device and is discarded immediately — SavDown does not log what you download or build a profile of your activity. All connections use HTTPS encryption.',
    '/privacy',
    'policy',
    'policies',
    'policy',
    ['security', 'policy', 'what_is'],
    0.8,
    ['privacy', 'store', 'security'],
  );

  page(
    'page-login-howto',
    'How to Sign In to SavDown',
    'How to sign in to SavDown:\n1. Go to savdown.com and click "Sign In" or "Open App".\n2. Choose Google (one click), GitHub, or email and password.\n3. For Google: click "Continue with Google" and select your account.\n4. For email: enter your email and password.\n5. No account yet? Click "Create Account" on the login page to register free.\nSign in at savdown.com/login.',
    '/login',
    'account',
    'auth',
    'page',
    ['authentication', 'how_to'],
    0.95,
    ['sign in', 'login', 'google', 'github', 'account'],
  );

  page(
    'page-login-trouble',
    'Cannot Sign In — Login Troubleshooting',
    'If you cannot sign in to SavDown:\n1. For Google sign-in: clear cookies, try incognito mode, or sign out of all Google accounts then sign back in.\n2. For email and password: use the Forgot Password link on the login page to reset your password.\n3. Make sure cookies are enabled in your browser.\n4. Try a different browser.\nIf none of these work, submit a support request from the Support button (bottom right of the page).',
    '/login',
    'account',
    'auth',
    'page',
    ['troubleshooting', 'authentication', 'error'],
    0.94,
    ['sign in', 'login', 'problem', 'password'],
  );

  page(
    'page-profile',
    'Change Profile Name, Avatar, Email, or Password',
    'To change your profile name, avatar photo, email, or password: open Workspace, then Settings at /workspace/settings. You can upload a new profile picture, update your name, change your password, or delete your account there.',
    '/workspace/settings',
    'account',
    'profile',
    'page',
    ['profile', 'how_to', 'settings'],
    0.88,
    ['profile', 'name', 'avatar', 'password', 'email'],
  );

  page(
    'page-settings',
    'Workspace Settings — Theme, Language, Profile',
    'Workspace Settings at /workspace/settings lets you update your profile (name, avatar, email, bio, job title, company), change your password, switch the theme, and pick your language. You can also review and delete your published reviews there.',
    '/workspace/settings',
    'account',
    'settings',
    'page',
    ['settings', 'how_to', 'profile'],
    0.86,
    ['settings', 'theme', 'language', 'preferences'],
  );

  page(
    'page-billing',
    'Billing, Plan, and Credit Balance',
    'View your SavCredits balance, current plan, and billing history at /account/billing (also linked from Workspace). Upgrade your plan or buy credit packs from the /pricing page. Payments are processed securely; paid subscriptions are managed through the billing portal.',
    '/account/billing',
    'billing',
    'billing',
    'page',
    ['billing', 'payment', 'account', 'how_to'],
    0.86,
    ['billing', 'plan', 'balance', 'history'],
  );

  page(
    'page-workspace',
    'The SavDown Workspace',
    'The SavDown Workspace at /workspace is your personal dashboard. It shows your credits balance, download history, billing, and every tool category. You must be signed in to use the Workspace.',
    '/workspace',
    'workspace',
    'workspace',
    'page',
    ['workspace', 'what_is', 'how_to'],
    0.85,
    ['workspace', 'dashboard'],
  );

  page(
    'page-downloads',
    'Where to Find Your Previous Downloads',
    'Every download you run through SavDown is listed, most recent first, at /workspace/downloads (Workspace → Downloads). The same history also appears under /workspace/activity. You must be signed in — downloads are tied to your account, and SavDown does not store the files themselves.',
    '/workspace/downloads',
    'workspace',
    'downloads',
    'page',
    ['downloads', 'activity', 'how_to', 'what_is'],
    0.94,
    ['downloads', 'history', 'previous', 'past'],
  );

  page(
    'page-activity',
    'Your SavDown Activity History',
    'Your full activity history across every SavDown tool is at /workspace/activity (Workspace → Activity). It lists each download with the tool and platform used, most recent first. You must be signed in to view it.',
    '/workspace/activity',
    'workspace',
    'activity',
    'page',
    ['activity', 'downloads', 'how_to', 'what_is'],
    0.9,
    ['activity', 'history'],
  );

  page(
    'page-files',
    'My Files',
    'My Files (/workspace/files) is rolling out — it will hold everything you have downloaded, uploaded, or generated in SavDown, searchable and organized in one place. Right now, your completed downloads are listed in Workspace → Downloads and Activity.',
    '/workspace/files',
    'workspace',
    'files',
    'page',
    ['files', 'what_is'],
    0.88,
    ['my files', 'saved files'],
  );

  page(
    'page-collections',
    'Collections',
    'Collections (/workspace/collections) is rolling out — it will let you group your favorite downloads and files into named collections such as Research, Inspiration, or Client Assets. It is not available to create yet; until then, your downloads stay listed in Workspace → Downloads.',
    '/workspace/collections',
    'workspace',
    'collections',
    'page',
    ['collections', 'how_to', 'what_is'],
    0.88,
    ['collections', 'folders', 'organize'],
  );

  page(
    'page-batch',
    'Batch Processing',
    'Batch processing (/workspace/batch) is rolling out — it will queue multiple links or files and process them together with live progress for every item. It is not available yet; individual tools still process their files in the normal way.',
    '/workspace/batch',
    'workspace',
    'batch',
    'page',
    ['batch', 'what_is'],
    0.86,
    ['batch', 'multiple', 'queue', 'bulk'],
  );

  page(
    'page-support',
    'How to Contact SavDown Support',
    'For help, use the Support button (bottom right of any page) to chat with the SavDown team — submit a support request and the team responds directly in the chat, usually within an hour. You can also reach SavDown through the contact page at /contact. You can attach a screenshot or file (images, PDF, or text, up to 4 MB, max 4 files) to your request.',
    '/contact',
    'support',
    'support',
    'page',
    ['support_request', 'how_to'],
    0.92,
    ['support', 'contact', 'help', 'ticket'],
  );

  page(
    'page-install',
    'Install SavDown / PWA',
    'SavDown is a web app — no install is needed. Just open savdown.com in any modern browser on desktop, tablet, or mobile. On mobile you can also add it to your home screen (it works as a progressive web app) using your browser\'s "Add to Home Screen" option.',
    '/',
    'site',
    'install',
    'page',
    ['how_to', 'what_is'],
    0.85,
    ['install', 'app', 'pwa', 'home screen'],
  );

  page(
    'page-faq-index',
    'SavDown FAQ Page',
    'The SavDown FAQ at /faq answers the most common questions about downloading, credits, plans, and every tool. Can\'t find your question? Reach the team on the contact page at /contact or via the Support button.',
    '/faq',
    'site',
    'faq-index',
    'page',
    ['what_is', 'support_request'],
    0.8,
    ['faq', 'questions'],
  );

  // Policy pages.
  page(
    'policy-terms',
    'Terms of Service',
    'SavDown\'s Terms of Service are at /terms. In short: only download content you own or have explicit permission to download, respect creators, and do not use SavDown for automated bulk pipelines or resale. SavDown routes media streams and does not store downloaded files.',
    '/terms',
    'policy',
    'policies',
    'policy',
    ['policy', 'security'],
    0.78,
    ['terms', 'terms of service'],
  );

  page(
    'policy-cookies',
    'Cookie Policy',
    'SavDown\'s Cookie Policy is at /cookies. SavDown uses essential cookies for sign-in and preferences; the site otherwise keeps tracking to a minimum.',
    '/cookies',
    'policy',
    'policies',
    'policy',
    ['policy'],
    0.75,
    ['cookies', 'cookie policy'],
  );

  page(
    'policy-dmca',
    'DMCA / Copyright',
    'SavDown\'s DMCA and copyright notice is at /dmca. SavDown only downloads public content you have permission to download — do not use it for copyrighted material you do not own. To report a copyright issue, follow the DMCA page.',
    '/dmca',
    'policy',
    'policies',
    'policy',
    ['policy', 'security'],
    0.75,
    ['dmca', 'copyright'],
  );

  // Troubleshooting — generic (entity-agnostic, applies to any tool).
  page(
    'trouble-download',
    'Download Failing — Troubleshooting',
    'If your download is failing:\n1. Make sure the URL is a public video — private videos cannot be downloaded.\n2. Check your SavCredits balance — you need at least 1 credit.\n3. Try a different browser or clear your browser cache.\n4. Some platforms temporarily block downloads — wait a few minutes and try again.\n5. For TikTok, copy the link from the Share menu rather than the address bar.\n6. For Instagram, make sure the account is public.\nIf the problem persists, submit a support request with the URL that is failing.',
    '/tools',
    'downloaders',
    'download-trouble',
    'page',
    ['troubleshooting', 'error'],
    0.95,
    ['download', 'failing', 'error'],
  );

  page(
    'trouble-tool',
    'Tool Not Working — Troubleshooting',
    'If a SavDown tool is not working:\n1. Refresh the page and try again.\n2. Check the file size limits: PDF tools allow up to 50 MB per file, video tools up to 100 MB, and image tools up to 25 MB.\n3. Make sure you have enough SavCredits.\n4. Try a different browser.\n5. Check that your file format is supported by the tool.\nIf the issue continues, submit a support request with details about which tool and what happened.',
    '/tools',
    'site',
    'tool-trouble',
    'page',
    ['troubleshooting', 'error'],
    0.93,
    ['tool', 'not working', 'error'],
  );

  page(
    'trouble-upload',
    'Upload Failed or File Too Large',
    'If you see a file-too-large or upload-failed error: PDF tools allow up to 50 MB per file and 150 MB combined per batch (max 10 files, 500 pages). Video tools allow up to 100 MB. Image tools allow up to 25 MB. To fix: use a smaller file, compress it first, or split the batch into smaller groups.',
    '/tools',
    'site',
    'upload-limits',
    'page',
    ['limits', 'error', 'troubleshooting'],
    0.92,
    ['upload', 'file too large', 'limit'],
  );

  // Real PDF limits, straight from the processing config.
  page(
    'pdf-limits',
    'PDF Tool Limits — File Size, Batch, Pages',
    `PDF tool limits: up to ${PDF_MAX_FILE_BYTES / (1024 * 1024)} MB per file, ${PDF_MAX_BATCH_BYTES / (1024 * 1024)} MB combined per batch, up to ${PDF_MAX_BATCH_FILES} files per batch, and up to ${PDF_MAX_PAGES} pages per document. Upgrade to Pro for higher limits.`,
    '/tools',
    'pdf',
    'pdf',
    'page',
    ['limits', 'supported_formats'],
    0.9,
    ['pdf', 'limit', 'size', 'batch', 'pages'],
  );

  // Maintenance / status.
  page(
    'page-maintenance',
    'SavDown Service Status and Maintenance',
    'SavDown runs as a web app with no scheduled maintenance window announced in advance. If a tool shows a maintenance or "temporarily unavailable" message, that specific feature is briefly down — wait a few minutes and retry, or use a different tool. If a problem persists, submit a support request.',
    '/contact',
    'site',
    'maintenance',
    'page',
    ['maintenance', 'troubleshooting'],
    0.8,
    ['maintenance', 'status', 'down', 'unavailable'],
  );

  return docs;
}

function blogDocs(): KnowledgeDocument[] {
  const docs: KnowledgeDocument[] = [];
  for (const post of blogPosts) {
    docs.push(...blogPostToDocs(post));
  }
  return docs;
}

/**
 * Pure blog-post → documents converter. Used for the static catalog
 * at build time and for DB-backed posts (admin Content Studio) at
 * request time — both shapes normalize to the same document model.
 */
export function blogPostToDocs(post: BlogPost): KnowledgeDocument[] {
  if (post.noIndex) return [];
  const url = `/blog/${post.slug}`;
  const category = (post.toolSlug ? 'blog' : 'blog') as KnowledgeCategory;
  const docs: KnowledgeDocument[] = [];

  docs.push(
    doc({
      id: `blog-${post.slug}`,
      title: post.title,
      body: `${post.excerpt}\nKeywords: ${[post.primaryKeyword, ...post.secondaryKeywords].filter(Boolean).join(', ')}`.slice(0, 500),
      url,
      sourceType: 'blog',
      category,
      entityType: 'article',
      entityId: post.slug,
      toolSlug: post.toolSlug,
      intents: intentsFor(post.title + ' ' + post.excerpt),
      priority: 0.6,
      status: 'supplementary',
      keywords: [post.primaryKeyword, ...post.secondaryKeywords, ...post.tags],
    }),
  );

  for (const item of post.faqItems ?? []) {
    docs.push(
      doc({
        id: `blog-faq-${post.slug}-${item.question.slice(0, 30).replace(/\s+/g, '-').toLowerCase()}`,
        title: `${post.title}: ${item.question}`,
        body: item.answer,
        url,
        sourceType: 'blog',
        category,
        entityType: 'article',
        entityId: post.slug,
        toolSlug: post.toolSlug,
        intents: intentsFor(item.question),
        priority: 0.68,
        status: 'supplementary',
        keywords: [post.primaryKeyword],
      }),
    );
  }

  if (post.howToSteps?.length) {
    const steps = post.howToSteps
      .map((s, i) => `${i + 1}. ${s.title} — ${s.description}`)
      .join('\n');
    docs.push(
      doc({
        id: `blog-howto-${post.slug}`,
        title: `${post.title}: How-To Steps`,
        body: steps.slice(0, 700),
        url,
        sourceType: 'blog',
        category,
        entityType: 'article',
        entityId: post.slug,
        toolSlug: post.toolSlug,
        intents: ['how_to'],
        priority: 0.66,
        status: 'supplementary',
        keywords: [post.primaryKeyword],
      }),
    );
  }

  return docs;
}

/** The full static corpus, built once per process. */
export function buildKnowledgeCorpus(): KnowledgeDocument[] {
  if (_corpus) return _corpus;
  _corpus = [...categoryDocs(), ...toolDocs(), ...siteDocs(), ...blogDocs()];
  return _corpus;
}

// ── Dynamic knowledge builders (pure — the route supplies data) ──

/** Live pricing documents, generated from the current pricing config. */
export function buildPricingKnowledge(config: PricingConfig): KnowledgeDocument[] {
  const money = (n: number) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
  const promoText = (promotion: Parameters<typeof activePromotion>[0]) => {
    const active = activePromotion(promotion);
    return active ? ` Promotion: ${active.badge ? `${active.badge} — ` : ''}${active.text}.` : '';
  };
  const plans = config.plans.filter((p) => p.visible && !p.archived).sort((a, b) => a.order - b.order);
  const packs = config.packs.filter((p) => p.visible && !p.archived).sort((a, b) => a.order - b.order);
  const lifetimes = config.lifetimes.filter((p) => p.visible && !p.archived).sort((a, b) => a.order - b.order);

  const planLines = plans.map((p) => {
    const price = p.monthlyPrice === 0
      ? 'free'
      : p.yearlyPrice > 0
        ? `${money(p.monthlyPrice)}/month or ${money(p.yearlyPrice)}/year`
        : `${money(p.monthlyPrice)}/month`;
    const credits = p.entitlementTier === 'FREE'
      ? `${(p.dailyCredits ?? Math.floor(p.monthlyCredits / 30)).toLocaleString()} credits/day, up to ${p.monthlyCredits.toLocaleString()}/month`
      : p.creditsLabel
        ? `${p.creditsLabel}${p.creditsNote ? ` (${p.creditsNote})` : ''}`
        : `${p.monthlyCredits.toLocaleString()} credits/month`;
    const promotions = `${promoText(p.promotions?.monthly)}${promoText(p.promotions?.yearly)}`;
    return `• ${p.name} — ${price}. ${credits}. ${p.features.join(', ')}.${promotions}`;
  });

  const doc_ = (
    id: string,
    title: string,
    body: string,
    intents: SupportIntent[],
    priority: number,
    entityId = 'pricing',
    keywords: string[] = [],
  ) =>
    doc({
      id,
      title,
      body,
      url: '/pricing',
      sourceType: 'pricing',
      category: 'pricing',
      entityType: 'area',
      entityId,
      intents,
      priority,
      keywords,
    });

  const docs: KnowledgeDocument[] = [];

  docs.push(
    doc_(
      'pricing-plans',
      'SavDown Plans and Prices',
       `SavDown plans:\n${planLines.join('\n')}${packs.map((pack) => `\n• ${pack.name} credit pack — ${money(pack.price)} one-time for ${(pack.credits + (pack.bonus ?? 0)).toLocaleString()} credits.${promoText(pack.promotion)}`).join('')}${lifetimes.map((lifetime) => `\n• ${lifetime.name} — ${money(lifetime.price)} one-time. ${lifetime.credits.toLocaleString()} finite lifetime credits that never expire.${promoText(lifetime.promotion)}`).join('')}`,
      ['pricing', 'plans', 'what_is'],
      0.97,
      'pricing',
      ['pricing', 'plans', 'price', 'cost'],
    ),
  );

  for (const p of plans) {
    const price = p.monthlyPrice === 0
      ? 'free, forever'
      : `${money(p.monthlyPrice)} per month${p.yearlyPrice > 0 ? `, or ${money(p.yearlyPrice)} per year (${money(Math.round((p.yearlyPrice / 12) * 100) / 100)}/month billed yearly)` : ''}`;
    const credits = p.entitlementTier === 'FREE'
      ? `${(p.dailyCredits ?? Math.floor(p.monthlyCredits / 30)).toLocaleString()} SavCredits per day, up to ${p.monthlyCredits.toLocaleString()} per month`
      : p.creditsLabel
        ? `${p.creditsLabel}${p.creditsNote ? `, ${p.creditsNote}` : ''}`
        : `${p.monthlyCredits.toLocaleString()} SavCredits per month`;
    docs.push(
      doc_(
        `pricing-${p.id}`,
        `${p.name} Plan — Price, Credits, and Features`,
        `The ${p.name} plan is ${price}. It includes ${credits}. Features: ${p.features.join(', ')}.${p.tagline ? ` ${p.tagline}` : ''}`,
        ['pricing', 'plans', 'feature'],
        0.95,
        'pricing',
        [p.name.toLowerCase(), 'plan'],
      ),
    );
  }

  if (packs.length) {
    const packLines = packs
      .map((p) => `• ${p.name} — ${p.credits.toLocaleString()} credits for ${money(p.price)}${p.bonus ? ` (${(p.credits + p.bonus).toLocaleString()} with bonus)` : ''}.${promoText(p.promotion)}`)
      .join('\n');
    docs.push(
      doc_(
        'pricing-packs',
        'SavDown Credit Packs',
        `Credit packs (one-time purchases, credits never expire):\n${packLines}\nBuy credit packs at /pricing — no subscription required.`,
        ['pricing', 'credits', 'payment'],
        0.94,
        'pricing',
        ['credit pack', 'top up', 'buy credits'],
      ),
    );
  }

  for (const lifetime of lifetimes) {
    docs.push(
      doc_(
        `pricing-lifetime-${lifetime.id}`,
        `${lifetime.name} Lifetime Plan`,
        `The ${lifetime.name} plan is a one-time payment of ${money(lifetime.price)} for ${lifetime.credits.toLocaleString()} finite SavCredits that never expire. ${lifetime.tagline} Benefits: ${lifetime.benefits.join('; ')}. Fair use: ${lifetime.fairUse.join(' ')}.${promoText(lifetime.promotion)}`,
        ['pricing', 'plans'],
        0.93,
        'pricing',
        ['lifetime', 'one time'],
      ),
    );
  }

  return docs;
}

/** SavCredits explainer, generated from the real per-job credit costs. */
export function buildCreditsKnowledge(costs: {
  proxyDownload: number;
  mergeDownload: number;
  merge4k: number;
  videoTool: number;
  imageTool: number;
  pdfTool: number;
  qrTool: number;
}, freeDailyCredits: number, freeMonthlyCap: number): KnowledgeDocument[] {
  const body =
    'SavCredits are SavDown\'s credit currency. What each operation costs:\n' +
    `• Direct downloads served from the CDN: ${costs.proxyDownload} credit.\n` +
    `• Server-side downloads (yt-dlp + FFmpeg mux): ${costs.mergeDownload} credit${costs.merge4k !== costs.mergeDownload ? `, and ${costs.merge4k} credits for 4K` : ''}.\n` +
    `• Video tools (convert, compress, GIF): ${costs.videoTool} credits.\n` +
    `• Image tools: ${costs.imageTool} credit.\n` +
    `• PDF tools: ${costs.pdfTool} credit.\n` +
    `• QR tools: ${costs.qrTool} credit.\n` +
    `Every account gets free daily credits (Free plan: ${freeDailyCredits} credits per day, up to ${freeMonthlyCap} per month). Purchased credits never expire. When you run out, wait for the daily refill, buy a credit pack, or upgrade to Pro at /pricing. Nothing is charged until a job succeeds — a failed job never costs a credit.`;
  return [
    doc({
      id: 'credits-explainer',
      title: 'How SavCredits Work — Costs, Refills, and Expiry',
      body,
      url: '/pricing',
      sourceType: 'pricing',
      category: 'credits',
      entityType: 'area',
      entityId: 'credits',
      intents: ['credits', 'limits', 'pricing', 'what_is'],
      priority: 0.97,
      keywords: ['savcredits', 'credits', 'cost', 'refill', 'balance'],
    }),
  ];
}

/** AI Image Generator limits, generated from the live config. */
export function buildAiImageKnowledge(config: AiImageConfig): KnowledgeDocument[] {
  const highCost = Math.round(config.creditCostStandard * config.highQualityMultiplier * 10) / 10;
  const body =
    `AI Image Generator limits and costs: one standard-quality image costs ${config.creditCostStandard} SavCredits; high quality costs ${highCost} credits. ` +
    `Free accounts get up to ${config.freeDailyLimit} generations per rolling day and ${config.maxImagesPerRequestFree} image per request; paid plans get up to ${config.maxImagesPerRequestPro} images per request. ` +
    `Prompts can be up to ${config.maxPromptLength} characters. If generation is unavailable, the tool shows: "${config.maintenanceMessage}"`;
  return [
    doc({
      id: 'ai-image-limits',
      title: 'AI Image Generator — Credit Cost, Daily Limit, and Limits',
      body,
      url: '/tools/ai-image-generator',
      sourceType: 'config',
      category: 'ai',
      entityType: 'tool',
      entityId: 'ai-image-generator',
      toolSlug: 'ai-image-generator',
      intents: ['limits', 'credits', 'pricing', 'maintenance', 'troubleshooting'],
      priority: 0.96,
      keywords: ['ai image', 'credits', 'limit', 'generation'],
    }),
  ];
}

// ── Entity index ─────────────────────────────────────────────

export type EntityType = 'tool' | 'category' | 'area';

export type EntityDef = {
  id: string;
  label: string;
  entityType: EntityType;
  /** SavDown category for category entities; the area's category for areas. */
  category: string | null;
  toolSlug?: string;
  url?: string;
  ctaLabel?: string;
  /** Live tool vs rolling-out ("Coming Soon"). */
  available: boolean;
  aliases: string[];
  tokens: string[];
  slugFrom?: string;
  slugTo?: string;
};

export type ResolvedEntity = {
  entity: EntityDef;
  confidence: 'high' | 'medium';
};

type AliasDef = { text: string; weight: number };

/**
 * Product areas — the non-tool parts of SavDown (pricing, credits,
 * account, workspace, support, …). Defined once; tools are all
 * derived from the catalog below.
 */
const AREA_DEFS: ReadonlyArray<{
  id: string;
  label: string;
  category: string | null;
  url: string;
  ctaLabel: string;
  aliases: string[];
}> = [
  {
    id: 'tools-discovery',
    label: 'All SavDown tools',
    category: null,
    url: '/tools',
    ctaLabel: 'Browse All Tools',
    aliases: ['savdown tools', 'all tools', 'every tool', 'tool list', 'tool catalog', 'what tools', 'tools', 'browse tools', 'list of tools', 'tool discovery'],
  },
  {
    id: 'pricing',
    label: 'Plans & Pricing',
    category: 'pricing',
    url: '/pricing',
    ctaLabel: 'View Pricing',
    aliases: ['pricing', 'price', 'prices', 'plans', 'plan', 'subscriptions', 'subscription', 'cost', 'upgrade', 'pro plan', 'free plan', 'lifetime plan', 'payment plans', 'how much does it cost', 'is savdown free'],
  },
  {
    id: 'credits',
    label: 'SavCredits',
    category: 'credits',
    url: '/pricing',
    ctaLabel: 'View Plans & Credits',
    aliases: ['savcredits', 'credits', 'credit', 'coins', 'credit balance', 'credit packs', 'credit pack', 'top up credits', 'daily credits', 'free credits', 'how do credits work', 'how many credits do i have'],
  },
  {
    id: 'billing',
    label: 'Billing & Payments',
    category: 'billing',
    url: '/account/billing',
    ctaLabel: 'Open Billing',
    aliases: ['billing', 'payment', 'payments', 'invoice', 'invoices', 'refund', 'refunds', 'charged', 'charge', 'card', 'checkout', 'payment failed', 'payment failure', 'failed payment'],
  },
  {
    id: 'auth',
    label: 'Sign in & accounts',
    category: 'account',
    url: '/login',
    ctaLabel: 'Go To Sign In',
    aliases: ['sign in', 'sign in with google', 'sign in with github', 'login', 'log in', 'sign up', 'create an account', 'create account', 'register', 'forgot password', 'reset password', 'google login', 'github login', 'password reset', 'authentication', 'sign in problem', 'login problem'],
  },
  {
    id: 'profile',
    label: 'Profile',
    category: 'account',
    url: '/workspace/settings',
    ctaLabel: 'Open Settings',
    aliases: ['profile', 'change name', 'change my name', 'avatar', 'profile picture', 'change email', 'update email', 'change my email'],
  },
  {
    id: 'settings',
    label: 'Settings',
    category: 'account',
    url: '/workspace/settings',
    ctaLabel: 'Open Settings',
    aliases: ['settings', 'preferences', 'theme', 'notifications', 'language settings', 'account settings', 'display settings'],
  },
  {
    id: 'downloads',
    label: 'Downloads',
    category: 'workspace',
    url: '/workspace/downloads',
    ctaLabel: 'Open Downloads',
    aliases: ['previous downloads', 'past downloads', 'download history', 'my downloads', 'downloads', 'downloaded files', 'previous files'],
  },
  {
    id: 'activity',
    label: 'Activity',
    category: 'workspace',
    url: '/workspace/activity',
    ctaLabel: 'Open Activity',
    aliases: ['activity', 'recent activity', 'activity history', 'full history', 'history'],
  },
  {
    id: 'files',
    label: 'My Files',
    category: 'workspace',
    url: '/workspace/files',
    ctaLabel: 'Open My Files',
    aliases: ['my files', 'saved files', 'files', 'file manager', 'saved downloads'],
  },
  {
    id: 'collections',
    label: 'Collections',
    category: 'workspace',
    url: '/workspace/collections',
    ctaLabel: 'Open Collections',
    aliases: ['collections', 'collection', 'folders', 'organize downloads', 'organize files', 'create a collection', 'save to a collection', 'named collections'],
  },
  {
    id: 'batch',
    label: 'Batch processing',
    category: 'workspace',
    url: '/workspace/batch',
    ctaLabel: 'Open Batch',
    aliases: ['batch', 'batch processing', 'multiple files', 'bulk processing', 'bulk download', 'queue multiple', 'process multiple'],
  },
  {
    id: 'workspace',
    label: 'Workspace',
    category: 'workspace',
    url: '/workspace',
    ctaLabel: 'Open Workspace',
    aliases: ['workspace', 'dashboard', 'my account', 'account area', 'personal dashboard'],
  },
  {
    id: 'support',
    label: 'Support',
    category: 'support',
    url: '/contact',
    ctaLabel: 'Contact Support',
    aliases: ['support', 'contact support', 'help', 'ticket', 'support request', 'human support', 'talk to a human', 'contact us', 'reach the team', 'report a problem'],
  },
  {
    id: 'install',
    label: 'Install SavDown',
    category: 'site',
    url: '/',
    ctaLabel: 'Open SavDown',
    aliases: ['install savdown', 'install the app', 'download the app', 'pwa', 'add to home screen', 'app install', 'progressive web app', 'install app'],
  },
  {
    id: 'maintenance',
    label: 'Service status',
    category: 'site',
    url: '/contact',
    ctaLabel: 'Contact Support',
    aliases: ['maintenance', 'outage', 'service status', 'downtime', 'temporarily unavailable'],
  },
  {
    id: 'policies',
    label: 'Policies',
    category: 'policy',
    url: '/privacy',
    ctaLabel: 'Read The Privacy Policy',
    aliases: ['privacy', 'privacy policy', 'terms', 'terms of service', 'cookies', 'cookie policy', 'dmca', 'copyright', 'legal', 'gdpr', 'data policy'],
  },
  {
    id: 'blog',
    label: 'Blog & guides',
    category: 'blog',
    url: '/blog',
    ctaLabel: 'Read The Blog',
    aliases: ['blog', 'articles', 'guides', 'posts', 'tutorials', 'savdown blog'],
  },
];

/** Alias origin weights — the tool's own name is the strongest signal. */
const NAME_W = 1.3;
const KEYWORD_W = 1.1;
const PLAIN_W = 1.0;

function toolAliases(tool: CatalogTool): AliasDef[] {
  const aliases: AliasDef[] = [];
  const name = tool.name.toLowerCase();
  const slugWords = tool.slug.replace(/-/g, ' ');

  aliases.push({ text: name, weight: NAME_W });
  if (slugWords !== name) aliases.push({ text: slugWords, weight: PLAIN_W });

  // "YouTube Video Downloader" → "youtube video" (name minus role word)
  const shortName = name.replace(
    /\s+(downloader|converter|generator|resizer|compressor|picker|scanner|remover|enhancer|upscaler|maker)$/,
    '',
  );
  if (shortName.length >= 3 && shortName !== name) {
    aliases.push({ text: shortName, weight: PLAIN_W });
  }

  for (const kw of tool.keywords ?? []) {
    if (kw.toLowerCase() !== name) aliases.push({ text: kw.toLowerCase(), weight: KEYWORD_W });
  }

  // Downloader platform patterns — generic over the platform field,
  // so every downloader (current and future) gets them automatically.
  if (tool.slug.endsWith('downloader')) {
    const dl = toolsBySlug.get(tool.slug);
    if (dl && dl.platform.length >= 2) {
      const p = dl.platform;
      aliases.push({ text: `${p} downloader`, weight: PLAIN_W });
      aliases.push({ text: `download ${p}`, weight: PLAIN_W });
      aliases.push({ text: `save ${p}`, weight: PLAIN_W });
    }
  }

  // Conversion slugs: jpg-to-pdf → "jpg to pdf", "convert jpg to pdf", …
  const m = tool.slug.match(/^([a-z0-9]+)-to-([a-z0-9]+)$/);
  if (m) {
    aliases.push({ text: `${m[1]} to ${m[2]}`, weight: PLAIN_W });
    aliases.push({ text: `convert ${m[1]} to ${m[2]}`, weight: PLAIN_W });
    aliases.push({ text: `${m[1]} into ${m[2]}`, weight: PLAIN_W });
    aliases.push({ text: `${m[1]} as ${m[2]}`, weight: PLAIN_W });
  }

  return aliases;
}

let _entityIndex: EntityDef[] | null = null;
let _idf: Map<string, number> | null = null;

function buildEntityIndex(): EntityDef[] {
  const entities: EntityDef[] = [];

  for (const area of AREA_DEFS) {
    const aliases = area.aliases.map((a) => ({ text: a, weight: PLAIN_W * 1.2 }));
    const tokens = new Set<string>();
    for (const a of aliases) for (const t of tokenize(a.text)) tokens.add(t);
    entities.push({
      id: area.id,
      label: area.label,
      entityType: 'area',
      category: area.category,
      url: area.url,
      ctaLabel: area.ctaLabel,
      available: true,
      aliases: area.aliases,
      tokens: [...tokens],
    });
  }

  for (const group of toolGroups) {
    const cat = groupSlug(group);
    const aliases = [`${group.toLowerCase()} tools`, group.toLowerCase()];
    if (group === 'Downloaders') aliases.push('downloaders', 'social media downloaders');
    const tokens = new Set<string>();
    for (const a of aliases) for (const t of tokenize(a)) tokens.add(t);
    // Keep category identity separate from member-tool vocabulary. If all
    // member keywords are copied here, a query such as "download YouTube"
    // resolves to the Downloaders category instead of the exact catalog tool.
    // Tool discovery still searches the category documents themselves; the
    // entity index should only use the category's own name and aliases.
    entities.push({
      id: cat,
      label: `${group} tools`,
      entityType: 'category',
      category: cat,
      url: `/tools#${cat}`,
      ctaLabel: `Browse ${group} Tools`,
      available: true,
      aliases,
      tokens: [...tokens],
    });
  }

  for (const tool of catalog) {
    const aliases = toolAliases(tool);
    const tokens = new Set<string>();
    for (const a of aliases) for (const t of tokenize(a.text)) tokens.add(t);
    for (const t of tokenize(tool.description)) tokens.add(t);
    for (const t of tokenize(tool.name)) tokens.add(t);

    const conv = tool.slug.match(/^([a-z0-9]+)-to-([a-z0-9]+)$/);
    entities.push({
      id: tool.slug,
      label: tool.name,
      entityType: 'tool',
      category: groupSlug(tool.group),
      toolSlug: tool.slug,
      url: `/tools/${tool.slug}`,
      ctaLabel: `Open ${tool.name}`,
      available: isToolAvailable(tool.slug),
      aliases: aliases.map((a) => a.text),
      tokens: [...tokens],
      slugFrom: conv?.[1],
      slugTo: conv?.[2],
    });
  }

  return entities;
}

export function getEntityIndex(): EntityDef[] {
  if (!_entityIndex) _entityIndex = buildEntityIndex();
  return _entityIndex;
}

/** Inverse document frequency across the entity index — rare tokens count more. */
function getIdf(): Map<string, number> {
  if (_idf) return _idf;
  const index = getEntityIndex();
  const df = new Map<string, number>();
  for (const entity of index) {
    for (const t of new Set(entity.tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const total = index.length;
  _idf = new Map([...df.entries()].map(([t, n]) => [t, Math.log(1 + total / n)]));
  return _idf;
}

/** Contiguous, order-preserving alias match against the message tokens. */
function contiguousMatch(aliasTokens: string[], msgTokens: string[]): boolean {
  if (!aliasTokens.length || aliasTokens.length > msgTokens.length) return false;
  outer: for (let i = 0; i <= msgTokens.length - aliasTokens.length; i++) {
    for (let j = 0; j < aliasTokens.length; j++) {
      if (!tokenEq(msgTokens[i + j], aliasTokens[j])) continue outer;
    }
    return true;
  }
  return false;
}

/** Extracts "x to/into/as y" conversion pairs from the raw message. */
function extractDirectionalPair(message: string): [string, string] | null {
  const m = message
    .toLowerCase()
    .match(/\b([a-z0-9]+)\s+(?:to|into|as)\s+([a-z0-9]+)\b/);
  if (!m) return null;
  const from = stem(m[1]);
  const to = stem(m[2]);
  if (from.length < 2 || to.length < 2) return null;
  return [from, to];
}

function directionalScore(
  entity: EntityDef,
  pair: [string, string],
): number {
  if (!entity.slugFrom || !entity.slugTo) return 0;
  const [from, to] = pair;
  const fromExpanded = new Set([from, ...synonymSet(from)]);
  const toExpanded = new Set([to, ...synonymSet(to)]);
  const fromMatch = fromExpanded.has(entity.slugFrom) || tokenEq(from, entity.slugFrom);
  const toMatch = toExpanded.has(entity.slugTo) || tokenEq(to, entity.slugTo);
  const revFrom = fromExpanded.has(entity.slugTo) || tokenEq(from, entity.slugTo);
  const revTo = toExpanded.has(entity.slugFrom) || tokenEq(to, entity.slugFrom);
  if (fromMatch && toMatch) return 3;
  if (toMatch) return 2;
  if (fromMatch) return 1;
  if (revFrom && revTo) return -3;
  if (revFrom || revTo) return -1;
  return 0;
}

/**
 * Resolves the SavDown entity (tool, category, or product area) a
 * message is about. Purely derived from the catalog + area registry:
 * add a tool to the catalog and it becomes resolvable here with no
 * further changes. Returns null when no entity is confidently
 * identified.
 */
export function resolveEntity(message: string): ResolvedEntity | null {
  const msgTokens = tokenize(message);
  if (!msgTokens.length) return null;
  const tokenSet = new Set(msgTokens);
  const expanded = new Set<string>();
  for (const t of msgTokens) for (const e of synonymSet(t)) expanded.add(e);

  const index = getEntityIndex();
  const idf = getIdf();
  const pair = extractDirectionalPair(message);
  const conversionQuestion = /\b(convert|conversion|transform|change)\b/i.test(message);
  const mediaQuestion = /\b(video|image|photo|file|media)\b/i.test(message);

  // Pre-compute alias tokenization once per entity per call is wasteful
  // across requests; alias lists are small so this is cheap.
  let best: {
    entity: EntityDef;
    score: number;
    phraseLen: number;
    directional: number;
  } | null = null;
  let secondBest = 0;

  for (const entity of index) {
    let phraseScore = 0;
    let phraseLen = 0;
    for (const alias of entity.aliases) {
      const aTokens = tokenize(alias);
      if (!aTokens.length) continue;
      if (contiguousMatch(aTokens, msgTokens)) {
        const weight = entity.entityType === 'area' ? PLAIN_W * 1.2 : entity.entityType === 'tool' && alias === entity.label.toLowerCase() ? NAME_W : PLAIN_W;
        const s = (2 + aTokens.length * 0.4) * weight;
        if (s > phraseScore) {
          phraseScore = s;
          phraseLen = aTokens.length;
        }
      }
    }

    const directional = pair ? directionalScore(entity, pair) : 0;

    // Name-token overlap: how much of the entity's own name/identity
    // vocabulary appears in the message (IDF-weighted).
    let overlap = 0;
    for (const t of entity.tokens) {
      if (tokenSet.has(t) || [...tokenSet].some((m) => tokenEq(m, t))) {
        overlap += idf.get(t) ?? 1;
      } else if (expanded.has(t)) {
        overlap += (idf.get(t) ?? 1) * 0.5;
      }
    }

    // Prefer the catalog's generic converter for an underspecified request
    // such as "convert a video". More specific converters still win when a
    // directional pair (for example MP4 → GIF) is present.
    const roleBoost = entity.entityType === 'tool' && conversionQuestion && mediaQuestion &&
      /\bconverter\b/i.test(entity.label) && !pair
      ? 1.4
      : 0;
    const score = phraseScore + directional + overlap * 1.5 + roleBoost;
    if (!best || score > best.score) {
      secondBest = best ? best.score : 0;
      best = { entity, score, phraseLen, directional };
    } else if (score > secondBest) {
      secondBest = score;
    }
  }

  if (!best) return null;
  const { entity, score, phraseLen, directional } = best;

  let confidence: 'high' | 'medium' | null = null;
  if (phraseLen >= 2 || directional >= 2) confidence = 'high';
  else if (phraseLen === 1 || directional === 1 || score >= 4) confidence = 'medium';

  // Must beat the runner-up clearly enough to avoid ambiguous picks.
  if (confidence && score - secondBest < 0.25 && score < 6) {
    confidence = null;
  }
  if (!confidence || score < 2) return null;
  return { entity, confidence };
}

// ── Retrieval ────────────────────────────────────────────────

export type SearchOptions = {
  entity?: ResolvedEntity | null;
  /** Confident category (from message scan) — biases retrieval. */
  category?: string | null;
  intent?: SupportIntent;
  topK?: number;
  minScore?: number;
  /** Full document list (static corpus + dynamic docs). Defaults to the static corpus. */
  corpus?: KnowledgeDocument[];
};

/** Site-wide documents are always eligible alongside entity matches. */
function isSiteWide(d: KnowledgeDocument): boolean {
  return d.category === 'site' || d.category === 'support';
}

function entityKeepsDoc(d: KnowledgeDocument, entity: EntityDef, intent?: SupportIntent): boolean {
  // Troubleshooting and error questions keep the generic
  // troubleshooting docs alongside the entity's own docs —
  // the fix is usually tool-agnostic (credits, browser, URL).
  if (intent === 'troubleshooting' || intent === 'error') {
    if (d.intents.includes('troubleshooting') || d.intents.includes('error')) return true;
  }
  if (entity.entityType === 'tool') {
    // Tool questions must not inherit unrelated pricing, account, or other
    // tool documents simply because they happen to share a common word. Keep
    // the exact tool, plus explicitly site-wide/support guidance (privacy,
    // generic help, and generic troubleshooting when requested).
    return d.toolSlug === entity.id || isSiteWide(d);
  }
  if (entity.entityType === 'category') {
    return d.category === entity.category || isSiteWide(d);
  }
  // area
  return d.entityId === entity.id || isSiteWide(d);
}

function scoreDocument(
  d: KnowledgeDocument,
  tokens: string[],
  expanded: Map<string, string[]>,
  opts: SearchOptions,
): number {
  const titleTokens = new Set(tokenize(d.title));
  const keywordTokens = new Set(d.keywords.flatMap((k) => tokenize(k)));
  const bodyTokenList = tokenize(d.body);
  const bodyLower = d.body.toLowerCase();
  const titleLower = d.title.toLowerCase();

  let score = 0;
  for (const qt of tokens) {
    if (titleTokens.has(qt)) {
      score += 2.5;
    } else if ([...titleTokens].some((tt) => tokenEq(tt, qt))) {
      score += 1.2;
    } else if (titleLower.includes(qt)) {
      score += 0.8;
    }
    if (keywordTokens.has(qt)) score += 1.8;
    if (bodyTokenList.includes(qt)) score += 1;
    else if (bodyLower.includes(qt)) score += 0.3;
    for (const ex of expanded.get(qt) ?? []) {
      if (titleTokens.has(ex)) score += 1.4;
      if (bodyTokenList.includes(ex)) score += 0.5;
    }
  }

  if (opts.intent && d.intents.includes(opts.intent)) {
    // Troubleshooting questions should surface the
    // troubleshooting content, not the happy-path how-to.
    score += opts.intent === 'troubleshooting' || opts.intent === 'error' ? 2.4 : 1.6;
  }

  if (opts.entity) {
    const e = opts.entity.entity;
    const isTroubleshooting =
      opts.intent === 'troubleshooting' || opts.intent === 'error';
    if (e.entityType === 'tool') {
      if (d.toolSlug === e.id) score += isTroubleshooting ? 1.5 : 3;
      else if (d.entityId === e.id) score += isTroubleshooting ? 1 : 2;
    } else if (e.entityType === 'category') {
      if (d.category === e.category) score += isTroubleshooting ? 1.8 : 2.2;
      else if (d.entityId === e.id) score += 1.6;
    } else {
      if (d.entityId === e.id) score += isTroubleshooting ? 2 : 2.5;
      else if (e.category && d.category === e.category) score += 1.2;
    }
  } else if (opts.category) {
    if (d.category === opts.category) score += 1.4;
  }

  return score * d.priority;
}

/**
 * Retrieves the most relevant SavDown knowledge documents for a
 * query. Entity/category/intent all shape scoring, and a confident
 * entity applies a hard relevance filter so unrelated tools never
 * contaminate the evidence set.
 */
export function searchKnowledge(
  query: string,
  opts: SearchOptions = {},
): KnowledgeDocument[] {
  const corpus = opts.corpus ?? buildKnowledgeCorpus();
  const tokens = tokenize(query);
  if (!tokens.length) {
    return corpus.filter((d) => d.priority >= 0.85).slice(0, opts.topK ?? 6);
  }

  const expanded = new Map<string, string[]>();
  for (const t of tokens) expanded.set(t, synonymSet(t).filter((s) => s !== t));

  let scored = corpus.map((d) => ({
    doc: d,
    score: scoreDocument(d, tokens, expanded, opts),
  }));

  // Hard entity filter — generic across every entity type.
  if (opts.entity && opts.entity.confidence) {
    const filtered = scored.filter((s) =>
      entityKeepsDoc(s.doc, opts.entity!.entity, opts.intent),
    );
    if (filtered.length) scored = filtered;
  }

  const minScore = opts.minScore ?? 0.08;
  return scored
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, opts.topK ?? 6)
    .map((s) => s.doc);
}

/**
 * Evidence sufficiency gate: is there enough verified, relevant
 * SavDown content to answer from? Never answer from general knowledge.
 */
export function hasSufficientEvidence(
  docs: KnowledgeDocument[],
  entity: ResolvedEntity | null,
): boolean {
  if (!docs.length) return false;
  const top = docs[0];
  if (top.priority < 0.55) return false;
  if (entity) {
    const e = entity.entity;
    if (e.entityType === 'tool' && !docs.some((d) => d.toolSlug === e.id)) return false;
    if (e.entityType === 'category' && !docs.some((d) => d.category === e.category)) return false;
    if (e.entityType === 'area' && !docs.some((d) => d.entityId === e.id) && !docs.some((d) => isSiteWide(d) && d.entityId !== 'site-faq')) {
      // areas must have their own content; site FAQs alone are not enough
      return false;
    }
  }
  return true;
}

// ── Source selection (same evidence set as the answer) ─────────

export function selectSources(
  docs: KnowledgeDocument[],
  maxSources = 3,
): Array<{ title: string; url: string }> {
  const seen = new Set<string>();
  const sources: Array<{ title: string; url: string }> = [];
  // Prefer docs that match the top doc's entity, then by priority.
  const top = docs[0];
  const ordered = top
    ? [...docs].sort((a, b) => {
        const aMatch = a.entityId === top.entityId || a.toolSlug === top.toolSlug ? 0 : 1;
        const bMatch = b.entityId === top.entityId || b.toolSlug === top.toolSlug ? 0 : 1;
        return aMatch - bMatch || b.priority - a.priority;
      })
    : docs;
  for (const d of ordered) {
    if (!d.url || seen.has(d.url)) continue;
    seen.add(d.url);
    const title = d.title
      .replace(/\s*[-–—]\s*SavDown.*$/i, '')
      .replace(/^[^:]+:\s+/, '')
      .slice(0, 60);
    sources.push({ title, url: d.url });
    if (sources.length >= maxSources) break;
  }
  return sources;
}

/** Compact evidence block for the LLM prompt. */
export function formatKnowledgeContext(docs: KnowledgeDocument[]): string {
  return docs
    .map((doc, i) => {
      const link = doc.url ? ` [${doc.url}]` : '';
      return `[${i + 1}] ${doc.title}${link}\n${doc.body.slice(0, 600)}`;
    })
    .join('\n\n');
}

/** Extracts the numbered steps from a how-to document body. */
export function extractSteps(doc: KnowledgeDocument): string[] {
  return doc.body
    .split('\n')
    .filter((line) => /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^\d+\.\s+/, ''));
}
