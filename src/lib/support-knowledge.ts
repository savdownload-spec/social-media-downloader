import 'server-only';
import { tools } from '@/config/tools';
import { catalog } from '@/config/catalog';
import { toolContent } from '@/config/toolContent';
import { homeFaqs } from '@/config/faqs';
import { blogPosts } from '@/config/blog';

export type KnowledgeDocument = {
  id: string;
  title: string;
  body: string;
  url?: string;
  category: 'tool-faq' | 'tool-guide' | 'tool-catalog' | 'site-faq' | 'pricing' | 'page' | 'blog';
  baseWeight: number;
};

// ── Static knowledge ──────────────────────────────────────────────────────

const PRICING_DOCS: KnowledgeDocument[] = [
  { id: 'pricing-free', title: 'Free Plan Credits', body: 'Every SavDown account gets 10 free SavCredits per day (up to 300 per month). No credit card required. Free users can download up to 1080p HD with no watermarks. Credits refresh every day automatically.', url: '/pricing', category: 'pricing', baseWeight: 0.92 },
  { id: 'pricing-pro', title: 'Pro Plan Subscription', body: 'Pro plan costs $9.99/month or $89/year. Includes 1,000 SavCredits per month, 4K downloads, batch jobs, and priority processing. Cancel any time.', url: '/pricing', category: 'pricing', baseWeight: 0.92 },
  { id: 'pricing-credits', title: 'SavCredits How Credits Work Run Out', body: 'Proxy downloads cost 1 credit. 4K or server-side merges cost 2 credits. Image and PDF tool operations cost 1 credit. QR tools cost 1 credit. Free plan refills 10 credits daily. Purchased credits never expire. When you run out of credits, wait for the daily refill, buy a credit pack, or upgrade to Pro. Credit packs: Starter 300 credits, Creator 1000 credits, Power 3000 credits.', url: '/pricing', category: 'pricing', baseWeight: 0.92 },
  { id: 'pricing-lifetime', title: 'Lifetime Plan One Time Payment', body: 'The SavDown Lifetime plan is a one-time payment of $199 that gives 30,000 SavCredits that never expire. This is a finite credit bank, not unlimited processing.', url: '/pricing', category: 'pricing', baseWeight: 0.85 },
];

const PAGE_DOCS: KnowledgeDocument[] = [
  { id: 'page-about', title: 'What Is SavDown About', body: 'SavDown is a free web-based toolkit for downloading media and processing files online. It supports YouTube, TikTok, Instagram, Facebook, Pinterest, and X (Twitter) video downloads. It also has image tools, PDF tools, video tools, AI tools, SEO tools, and utility tools. No watermarks, no signup required for basic use. Free daily credits included.', url: '/about', category: 'page', baseWeight: 0.85 },
  { id: 'page-privacy', title: 'Privacy Does SavDown Store Files', body: 'SavDown does not store downloaded files on its servers. Files stream directly to the user and are discarded immediately. SavDown does not log what you download or build a profile of your activity. All connections use HTTPS encryption.', url: '/privacy', category: 'page', baseWeight: 0.75 },
  { id: 'page-login', title: 'How to Sign In Login Google Account', body: 'Sign in to SavDown at /login using Google, GitHub, or email and password. If Google sign-in keeps returning to the login page, try clearing cookies, using a different browser, or signing out of all Google accounts first. Email sign-in requires the password you registered with. Forgot password option is available on the login page.', url: '/login', category: 'page', baseWeight: 0.9 },
  { id: 'page-profile', title: 'Change Profile Name Avatar Password Settings', body: 'To change your profile name, avatar photo, email, or password go to Workspace then Settings at /workspace/settings. You can upload a new profile picture, update your name, change your password, or delete your account there.', url: '/workspace/settings', category: 'page', baseWeight: 0.85 },
  { id: 'page-billing', title: 'Credits Balance Billing Plan History', body: 'View your SavCredits balance, current plan, and billing history at /workspace/billing. Upgrade your plan or buy credit packs from the /pricing page. Payments are processed securely via Safepay.', url: '/workspace/billing', category: 'page', baseWeight: 0.85 },
  { id: 'page-pdf-limits', title: 'PDF Batch File Limits How Many Files', body: 'PDF tool batch file limits per plan. Merge PDF: Free 5 files, Pro 30. Split PDF: Free 5, Pro 20. Compress PDF: Free 10, Pro 30. JPG to PDF: Free 10, Pro 50. PDF to JPG: Free 5, Pro 20. Maximum file size per file is 50 MB. Maximum combined batch size is 150 MB. Upgrade to Pro for higher limits.', url: '/tools/merge-pdf', category: 'tool-guide', baseWeight: 0.9 },
  { id: 'page-upload-error', title: 'File Too Large Upload Failed Error Fix', body: 'If you see a file too large or upload failed error: PDF tools allow maximum 50 MB per file and 150 MB combined total. Video tools allow maximum 100 MB. Image tools allow maximum 25 MB. To fix this error: use a smaller file, compress it first, or split the batch into smaller groups.', url: '/tools', category: 'tool-guide', baseWeight: 0.9 },
  { id: 'page-batch-download', title: 'Batch Processing Multiple Files Download Results', body: 'PDF tools support batch processing of multiple files at once. After processing a batch, you can download results individually or download all results as a ZIP file using the Download ZIP button. Video and image tools process one file at a time.', url: '/tools', category: 'tool-guide', baseWeight: 0.85 },
  { id: 'page-support', title: 'Contact Support Help Reach Team', body: 'For help, use the Support button (bottom right of the page) to chat with the SavDown team. Submit a support request and the team will respond directly in the chat. You can also reach us through the contact page at /contact.', url: '/contact', category: 'page', baseWeight: 0.8 },
  { id: 'page-workspace', title: 'Workspace Dashboard Account Area', body: 'The SavDown Workspace at /workspace is your personal dashboard. It shows your credits balance, download history, billing, and tool access. You must be signed in to use the Workspace. The Workspace gives you access to all tools, your history, and account settings.', url: '/workspace', category: 'page', baseWeight: 0.8 },
];

// ── Synonym expansion ─────────────────────────────────────────────────────
// Maps user terms to canonical document terms so "savcredits" matches
// "credits", "save" matches "download", etc. Applied before scoring.
const SYNONYMS: Record<string, string[]> = {
  credits:    ['savcredits', 'credit', 'coins', 'tokens', 'balance'],
  download:   ['save', 'saving', 'grab', 'get', 'fetch', 'export'],
  merge:      ['combine', 'join', 'concatenate', 'append'],
  compress:   ['shrink', 'reduce', 'smaller', 'optimize', 'compress'],
  convert:    ['change', 'transform', 'turn', 'format'],
  pdf:        ['document', 'doc', 'file'],
  video:      ['clip', 'film', 'movie', 'footage'],
  image:      ['photo', 'picture', 'img', 'jpeg', 'jpg', 'png'],
  youtube:    ['yt', 'ytb'],
  tiktok:     ['tik', 'tok', 'tiktok'],
  instagram:  ['ig', 'insta'],
  facebook:   ['fb', 'meta'],
  twitter:    ['tweet', 'x'],
  login:      ['sign in', 'signin', 'log in', 'login', 'account'],
  password:   ['pass', 'passwd', 'pw'],
  plan:       ['subscription', 'tier', 'membership', 'upgrade'],
  free:       ['no cost', 'gratis', 'zero'],
  batch:      ['multiple', 'bulk', 'several', 'many'],
  error:      ['fail', 'failed', 'broken', 'not working', 'issue', 'problem', 'wrong'],
  watermark:  ['logo', 'stamp', 'overlay'],
  quality:    ['resolution', 'hd', '4k', '1080p', '720p'],
};

function expandSynonyms(tokens: string[]): string[] {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
      if (aliases.includes(token)) expanded.add(canonical);
      if (token === canonical) aliases.forEach(a => expanded.add(a));
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
    // Exact match in title: highest weight
    if (titleToks.includes(qt)) { score += 2.5; continue; }
    // Partial match in title (substring)
    if (titleToks.some(t => t.includes(qt) || qt.includes(t))) score += 1.5;
    // Exact match in body
    if (bodyToks.includes(qt)) score += 1;
    // Partial match in body
    else if (bodyToks.some(t => t.includes(qt) || qt.includes(t))) score += 0.4;
  }
  return (score / Math.max(queryTokens.length, 1)) * doc.baseWeight;
}

// ── Corpus cache ──────────────────────────────────────────────────────────

let _corpus: KnowledgeDocument[] | null = null;

export function buildKnowledgeCorpus(): KnowledgeDocument[] {
  if (_corpus) return _corpus;
  const docs: KnowledgeDocument[] = [];

  // Site-level FAQs (high authority)
  for (const faq of homeFaqs) {
    docs.push({ id: 'site-faq-' + docs.length, title: faq.question, body: faq.answer, url: '/faq', category: 'site-faq', baseWeight: 0.92 });
  }

  // Per-tool FAQs (highest authority for tool-specific questions)
  for (const tool of tools) {
    for (const faq of tool.faq) {
      docs.push({ id: 'tool-faq-' + tool.slug + '-' + docs.length, title: tool.name + ': ' + faq.question, body: faq.answer, url: '/tools/' + tool.slug, category: 'tool-faq', baseWeight: 0.96 });
    }
  }

  // Catalog one-liners (good for "what is X" queries)
  for (const tool of catalog) {
    docs.push({ id: 'catalog-' + tool.slug, title: tool.name, body: tool.name + ' (' + tool.group + ' tool): ' + tool.description, url: '/tools/' + tool.slug, category: 'tool-catalog', baseWeight: 0.65 });
  }

  // Rich tool content (key sections only)
  for (const [slug, content] of Object.entries(toolContent)) {
    const toolName = catalog.find(t => t.slug === slug)?.name ?? slug;
    const href = '/tools/' + slug;
    docs.push({ id: 'guide-intro-' + slug, title: toolName + ' What It Does How It Works', body: (content.whatItDoes + ' ' + content.introduction).slice(0, 500), url: href, category: 'tool-guide', baseWeight: 0.82 });
    if (content.bestPractices.length) {
      docs.push({ id: 'guide-tips-' + slug, title: toolName + ' Tips Best Practices', body: content.bestPractices.slice(0, 5).join(' '), url: href, category: 'tool-guide', baseWeight: 0.76 });
    }
    if (content.supportedPlatforms.length) {
      docs.push({ id: 'guide-platforms-' + slug, title: toolName + ' Supported Formats Platforms Links', body: 'Supported URL types and formats: ' + content.supportedPlatforms.join(', '), url: href, category: 'tool-guide', baseWeight: 0.72 });
    }
  }

  // Pricing + page docs
  docs.push(...PRICING_DOCS);
  docs.push(...PAGE_DOCS);

  // Blog excerpts (supplementary)
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
  opts: { topK?: number; minScore?: number } = {},
): KnowledgeDocument[] {
  const { topK = 6, minScore = 0.08 } = opts;
  const corpus = buildKnowledgeCorpus();
  const rawTokens = tokenize(query);
  const tokens = expandSynonyms(rawTokens);
  if (!tokens.length) return corpus.slice(0, topK);
  return corpus
    .map(doc => ({ doc, score: scoreDoc(doc, tokens) }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ doc }) => doc);
}

export function formatKnowledgeContext(docs: KnowledgeDocument[]): string {
  if (!docs.length) return '';
  return docs.map((doc, i) => {
    const link = doc.url ? ' [' + doc.url + ']' : '';
    return '[' + (i + 1) + '] ' + doc.title + link + '\n' + doc.body.slice(0, 400);
  }).join('\n\n');
}