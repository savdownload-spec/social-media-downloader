import 'server-only';
import { tools } from '@/config/tools';
import { catalog } from '@/config/catalog';
import { toolContent } from '@/config/toolContent';
import { functionalToolContent } from '@/config/functionalToolContent';
import { homeFaqs } from '@/config/faqs';
import { blogPosts } from '@/config/blog';

export type KnowledgeDocument = {
  id: string;
  title: string;
  body: string;
  url?: string;
  /** Canonical tool slug this doc belongs to, used for relevance validation */
  toolSlug?: string;
  category: 'tool-faq' | 'tool-guide' | 'tool-catalog' | 'site-faq' | 'pricing' | 'page' | 'blog';
  baseWeight: number;
};

// ── Static knowledge ──────────────────────────────────────────────────────

const PRICING_DOCS: KnowledgeDocument[] = [
  // Explicit plans overview — high priority for "what plans are available", "pricing", "how much does it cost"
  { id: 'pricing-overview', title: 'SavDown Plans Available Pricing What Plans Are There', body: 'SavDown has three main plans: Free, Pro, and Lifetime. Free plan: 10 credits/day (300/month), 1080p HD downloads, no watermarks, no card required. Pro plan: $9.99/month or $89/year, 1,000 credits/month, 4K downloads, batch jobs, priority processing. Lifetime plan: $199 one-time payment, 30,000 credits that never expire. You can also buy credit packs (Starter 300 credits/$5, Creator 1000 credits/$14, Power 3000 credits/$36) without a subscription.', url: '/pricing', category: 'pricing', baseWeight: 0.98 },
  { id: 'pricing-free', title: 'Free Plan Credits Daily', body: 'Every SavDown account gets 10 free SavCredits per day (up to 300 per month). No credit card required. Free users can download up to 1080p HD with no watermarks. Credits refresh every day automatically.', url: '/pricing', category: 'pricing', baseWeight: 0.92 },
  { id: 'pricing-pro', title: 'Pro Plan Subscription Cost', body: 'Pro plan costs $9.99/month or $89/year. Includes 1,000 SavCredits per month, 4K downloads, batch jobs, and priority processing. Cancel any time.', url: '/pricing', category: 'pricing', baseWeight: 0.92 },
  { id: 'pricing-credits', title: 'SavCredits How Credits Work Run Out Buy', body: 'Proxy downloads cost 1 credit. 4K or server-side merges cost 2 credits. Image and PDF tool operations cost 1 credit. QR tools cost 1 credit. Free plan refills 10 credits daily. Purchased credits never expire. When you run out of credits, wait for the daily refill, buy a credit pack, or upgrade to Pro. Credit packs: Starter 300 credits, Creator 1000 credits, Power 3000 credits.', url: '/pricing', category: 'pricing', baseWeight: 0.92 },
  { id: 'pricing-lifetime', title: 'Lifetime Plan One Time Payment', body: 'The SavDown Lifetime plan is a one-time payment of $199 that gives 30,000 SavCredits that never expire. This is a finite credit bank, not unlimited processing.', url: '/pricing', category: 'pricing', baseWeight: 0.85 },
];

const PAGE_DOCS: KnowledgeDocument[] = [
  // ── Troubleshooting (high priority) ──
  { id: 'trouble-download', title: 'Download Failing Not Working Error Fix Troubleshoot', body: 'If your download is failing or not working: 1) Make sure the URL is a public video (private videos cannot be downloaded). 2) Check your SavCredits balance you need at least 1 credit. 3) Try a different browser or clear your browser cache. 4) Some platforms temporarily block downloads wait a few minutes and try again. 5) For TikTok copy the link from the Share menu. 6) For Instagram make sure the account is public. If the problem persists submit a support request.', url: '/tools', category: 'tool-guide', baseWeight: 0.97 },
  { id: 'trouble-tool', title: 'Tool Not Working Error Problem Fix', body: 'If a SavDown tool is not working: 1) Refresh the page and try again. 2) Check the file size limits: PDF max 50 MB per file, video max 100 MB, image max 25 MB. 3) Make sure you have enough SavCredits. 4) Try a different browser. 5) Check that your file format is supported by the tool. If the issue continues please submit a support request with details.', url: '/tools', category: 'tool-guide', baseWeight: 0.95 },
  { id: 'trouble-login', title: 'Cannot Login Sign In Problem Google', body: 'If you cannot sign in or login: 1) For Google sign-in: clear cookies, try incognito mode, or sign out of all Google accounts then sign back in. 2) For email/password: use the Forgot Password link on the login page. 3) Make sure cookies are enabled in your browser. 4) Try a different browser. If none of these work submit a support request.', url: '/login', category: 'page', baseWeight: 0.93 },
  // ── Regular page docs ──
  { id: 'page-about', title: 'What Is SavDown About Overview', body: 'SavDown is a free web-based toolkit for downloading media and processing files online. It supports YouTube, TikTok, Instagram, Facebook, Pinterest, and X (Twitter) video downloads. It also has image tools, PDF tools, video tools, AI tools, SEO tools, and utility tools. No watermarks, no signup required for basic use. Free daily credits included.', url: '/about', category: 'page', baseWeight: 0.85 },
  { id: 'page-privacy', title: 'Privacy Does SavDown Store Save Files', body: 'SavDown does not store downloaded files on its servers. Files stream directly to the user and are discarded immediately. SavDown does not log what you download or build a profile of your activity. All connections use HTTPS encryption.', url: '/privacy', category: 'page', baseWeight: 0.75 },
  { id: 'page-login', title: 'How to Sign In Login Google Account', body: 'Sign in to SavDown at /login using Google, GitHub, or email and password. If Google sign-in keeps returning to the login page, try clearing cookies, using a different browser, or signing out of all Google accounts first. Email sign-in requires the password you registered with. Forgot password option is available on the login page.', url: '/login', category: 'page', baseWeight: 0.9 },
  { id: 'page-profile', title: 'Change Profile Name Avatar Password Settings', body: 'To change your profile name, avatar photo, email, or password go to Workspace then Settings at /workspace/settings. You can upload a new profile picture, update your name, change your password, or delete your account there.', url: '/workspace/settings', category: 'page', baseWeight: 0.85 },
  { id: 'page-billing', title: 'Credits Balance Billing Plan History', body: 'View your SavCredits balance, current plan, and billing history at /workspace/billing. Upgrade your plan or buy credit packs from the /pricing page. Payments are processed securely via Safepay.', url: '/workspace/billing', category: 'page', baseWeight: 0.85 },
  { id: 'page-pdf-limits', title: 'PDF Batch Limits How Many Files Upload', body: 'PDF tool batch limits per plan. Merge PDF: Free 5, Pro 30. Split PDF: Free 5, Pro 20. Compress PDF: Free 10, Pro 30. JPG to PDF: Free 10, Pro 50. PDF to JPG: Free 5, Pro 20. Maximum per-file: 50 MB. Maximum combined: 150 MB. Upgrade to Pro for higher limits.', url: '/tools/merge-pdf', category: 'tool-guide', baseWeight: 0.88 },
  { id: 'page-upload-error', title: 'Upload Failed Error Fix Large File', body: 'If you see a file too large or upload failed error: PDF tools allow maximum 50 MB per file and 150 MB combined total. Video tools allow maximum 100 MB. Image tools allow maximum 25 MB. To fix: use a smaller file, compress it first, or split the batch into smaller groups.', url: '/tools', category: 'tool-guide', baseWeight: 0.88 },
  { id: 'page-batch-download', title: 'Batch Processing Multiple Files Download ZIP Results', body: 'PDF tools support batch processing of multiple files at once. After processing a batch, you can download results individually or download all results as a ZIP file using the Download ZIP button. Video and image tools process one file at a time.', url: '/tools', category: 'tool-guide', baseWeight: 0.85 },
  { id: 'page-support', title: 'Contact Support Help Reach Team', body: 'For help, use the Support button (bottom right of the page) to chat with the SavDown team. Submit a support request and the team will respond directly in the chat. You can also reach us through the contact page at /contact.', url: '/contact', category: 'page', baseWeight: 0.8 },
  { id: 'page-workspace', title: 'Workspace Dashboard Account Area', body: 'The SavDown Workspace at /workspace is your personal dashboard. It shows your credits balance, download history, billing, and tool access. You must be signed in to use the Workspace.', url: '/workspace', category: 'page', baseWeight: 0.8 },
];

// ── Synonym expansion ─────────────────────────────────────────────────────
// IMPORTANT: Keep 'pdf' synonyms lean — do NOT include 'file' here because
// that causes every document mentioning "file" to score highly for PDF queries,
// incorrectly boosting generic docs like "PDF Batch File Limits" over specific
// tool guides like "Compress PDF".
const SYNONYMS: Record<string, string[]> = {
  credits:      ['savcredits', 'credit', 'coins', 'tokens', 'balance'],
  download:     ['save', 'saving', 'grab', 'fetch', 'export', 'get'],
  merge:        ['combine', 'join', 'concatenate', 'append', 'combine'],
  compress:     ['shrink', 'reduce', 'smaller', 'optimize', 'compression', 'make smaller', 'reduce size'],
  convert:      ['change', 'transform', 'turn into', 'export as'],
  pdf:          ['document', 'doc'],   // deliberately NOT 'file'
  video:        ['clip', 'film', 'footage', 'mp4'],
  image:        ['photo', 'picture', 'jpeg', 'jpg', 'png', 'img'],
  youtube:      ['yt', 'ytb'],
  tiktok:       ['tik tok', 'tiktok'],
  instagram:    ['ig', 'insta'],
  facebook:     ['fb', 'meta'],
  twitter:      ['tweet', 'x'],
  login:        ['sign in', 'signin', 'log in', 'signin', 'account access'],
  password:     ['pass', 'passwd', 'pw', 'passphrase'],
  plan:         ['subscription', 'tier', 'membership', 'upgrade', 'paid'],
  free:         ['no cost', 'gratis', 'zero cost'],
  batch:        ['multiple', 'bulk', 'several', 'many files'],
  error:        ['fail', 'failing', 'failed', 'broken', 'not working', 'issue', 'problem', 'wrong', 'wont work', 'cant'],
  troubleshoot: ['fix', 'solve', 'debug', 'repair'],
  watermark:    ['logo', 'stamp', 'overlay', 'branding'],
  quality:      ['resolution', 'hd', '4k', '1080p', '720p'],
  split:        ['separate', 'divide', 'extract pages', 'break apart'],
  word:         ['docx', 'microsoft word', 'doc file'],
};

function expandSynonyms(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
      if (aliases.includes(token)) expanded.add(canonical);
      if (token === canonical) aliases.forEach(a => {
        // Only add single-word aliases to avoid tokenization mismatch
        if (!a.includes(' ')) expanded.add(a);
      });
    }
  }
  return [...expanded];
}

// ── Tokenizer + scoring ───────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','is','it','in','on','to','for','of','and','or','be','at','by','as',
  'do','we','my','me','so','if','no','up','can','has','how','its','was','are','our',
  'not','with','this','that','from','they','will','have','just','than','then','you',
  'your','what','when','why','where','which','who','been','would','could','should',
  'i', 'am', 'get', 'got', 'use', 'used', 'using',
]);

function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

function scoreDoc(doc: KnowledgeDocument, queryTokens: string[]): number {
  if (!queryTokens.length) return 0;
  const titleToks = tokenize(doc.title);
  const bodyToks = tokenize(doc.body);
  let score = 0;
  for (const qt of queryTokens) {
    if (titleToks.includes(qt)) { score += 2.5; continue; }
    if (titleToks.some(t => t.includes(qt) || qt.includes(t))) score += 1.5;
    if (bodyToks.includes(qt)) score += 1;
    else if (bodyToks.some(t => t.includes(qt) || qt.includes(t))) score += 0.4;
  }
  return (score / Math.max(queryTokens.length, 1)) * doc.baseWeight;
}

// ── Corpus cache ──────────────────────────────────────────────────────────

let _corpus: KnowledgeDocument[] | null = null;

export function buildKnowledgeCorpus(): KnowledgeDocument[] {
  if (_corpus) return _corpus;
  const docs: KnowledgeDocument[] = [];

  // 1. Site-level FAQs
  for (const faq of homeFaqs) {
    docs.push({ id: 'site-faq-' + docs.length, title: faq.question, body: faq.answer, url: '/faq', category: 'site-faq', baseWeight: 0.92 });
  }

  // 2. Per-tool FAQs from downloader tools (tools.ts)
  for (const tool of tools) {
    for (const faq of tool.faq) {
      docs.push({ id: 'tool-faq-' + tool.slug + '-' + docs.length, title: tool.name + ': ' + faq.question, body: faq.answer, url: '/tools/' + tool.slug, toolSlug: tool.slug, category: 'tool-faq', baseWeight: 0.96 });
    }
  }

  // 3. Per-tool FAQs from functional tools (functionalToolContent.ts)
  // This is the KEY fix: compress-pdf, merge-pdf, image tools, video tools,
  // QR tools, SEO tools, and AI tools all have FAQs here that were previously
  // never indexed.
  for (const [slug, content] of Object.entries(functionalToolContent)) {
    const toolName = catalog.find(t => t.slug === slug)?.name ?? slug;
    const href = '/tools/' + slug;
    for (const faq of content.faq) {
      docs.push({
        id: 'functional-faq-' + slug + '-' + docs.length,
        title: toolName + ': ' + faq.question,
        body: faq.answer,
        url: href,
        toolSlug: slug,
        category: 'tool-faq',
        baseWeight: 0.96,
      });
    }
    // Also index howTo steps as a guide doc
    if (content.howTo.length) {
      const howToBody = content.howTo.map(s => s.title + ': ' + s.body).join(' ');
      docs.push({
        id: 'functional-howto-' + slug,
        title: 'How to use ' + toolName + ' Step by Step Guide',
        body: howToBody.slice(0, 500),
        url: href,
        toolSlug: slug,
        category: 'tool-guide',
        baseWeight: 0.9,
      });
    }
  }

  // 4. Catalog one-liners
  for (const tool of catalog) {
    docs.push({ id: 'catalog-' + tool.slug, title: tool.name, body: tool.name + ' (' + tool.group + ' tool): ' + tool.description, url: '/tools/' + tool.slug, toolSlug: tool.slug, category: 'tool-catalog', baseWeight: 0.65 });
  }

  // 5. Rich tool content from toolContent.ts (downloader-focused)
  for (const [slug, content] of Object.entries(toolContent)) {
    const toolName = catalog.find(t => t.slug === slug)?.name ?? slug;
    const href = '/tools/' + slug;
    docs.push({ id: 'guide-intro-' + slug, title: toolName + ' What It Does How It Works Guide', body: (content.whatItDoes + ' ' + content.introduction).slice(0, 500), url: href, toolSlug: slug, category: 'tool-guide', baseWeight: 0.82 });
    if (content.bestPractices.length) {
      docs.push({ id: 'guide-tips-' + slug, title: toolName + ' Tips Best Practices', body: content.bestPractices.slice(0, 5).join(' '), url: href, toolSlug: slug, category: 'tool-guide', baseWeight: 0.76 });
    }
    if (content.supportedPlatforms.length) {
      docs.push({ id: 'guide-platforms-' + slug, title: toolName + ' Supported Formats Platforms', body: 'Supported: ' + content.supportedPlatforms.join(', '), url: href, toolSlug: slug, category: 'tool-guide', baseWeight: 0.72 });
    }
  }

  // 6. Pricing + page docs
  docs.push(...PRICING_DOCS);
  docs.push(...PAGE_DOCS);

  // 7. Blog excerpts (supplementary, lowest priority)
  for (const post of blogPosts) {
    docs.push({
      id: 'blog-' + post.slug,
      title: post.title,
      body: post.excerpt + ' Keywords: ' + [post.primaryKeyword, ...post.secondaryKeywords].join(', '),
      url: '/blog/' + post.slug,
      category: 'blog',
      baseWeight: 0.6,
    });
  }

  _corpus = docs;
  return docs;
}

// ── Public retrieval API ───────────────────────────────────────────────────

export function retrieveKnowledge(
  query: string,
  opts: { topK?: number; minScore?: number; toolSlugHint?: string; pricingBoost?: boolean } = {},
): KnowledgeDocument[] {
  const { topK = 6, minScore = 0.08, toolSlugHint, pricingBoost } = opts;
  const corpus = buildKnowledgeCorpus();
  const rawTokens = tokenize(query);
  const tokens = expandSynonyms(rawTokens);
  if (!tokens.length) return corpus.slice(0, topK);

  const scored = corpus
    .map(doc => {
      let score = scoreDoc(doc, tokens);
      // Boost docs that belong to a tool explicitly hinted by the caller
      if (toolSlugHint && doc.toolSlug === toolSlugHint) score *= 1.4;
      // Boost pricing/plan docs for pricing-intent questions
      if (pricingBoost && doc.category === 'pricing') score *= 1.5;
      return { doc, score };
    })
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK).map(({ doc }) => doc);
}

/**
 * Returns only sources genuinely relevant to the answer.
 * Takes the top docs and the winning doc's toolSlug; filters out docs from
 * unrelated tools so sources don't include Instagram links for a PDF question.
 */
export function selectSources(
  docs: KnowledgeDocument[],
  maxSources = 3,
): { title: string; url: string }[] {
  if (!docs.length) return [];

  const topDoc = docs[0];
  const topSlug = topDoc.toolSlug;

  // Prefer sources that share the tool slug with the top answer doc
  const relevant = topSlug
    ? docs.filter(d => d.url && (d.toolSlug === topSlug || !d.toolSlug))
    : docs.filter(d => d.url);

  // Deduplicate by URL, keep only distinctly titled ones
  const seen = new Set<string>();
  const sources: { title: string; url: string }[] = [];
  for (const d of relevant) {
    if (!d.url || seen.has(d.url)) continue;
    seen.add(d.url);
    // Clean up internal doc-title prefixes like "Compress PDF: How much..."
    const title = d.title
      .replace(/\s*-\s*SavDown.*$/i, '')
      .replace(/^[^:]+:\s+/, ''); // strip "ToolName: " prefix
    sources.push({ title: title.slice(0, 60), url: d.url });
    if (sources.length >= maxSources) break;
  }
  return sources;
}

export function formatKnowledgeContext(docs: KnowledgeDocument[]): string {
  if (!docs.length) return '';
  return docs.map((doc, i) => {
    const link = doc.url ? ' [' + doc.url + ']' : '';
    return '[' + (i + 1) + '] ' + doc.title + link + '\n' + doc.body.slice(0, 400);
  }).join('\n\n');
}