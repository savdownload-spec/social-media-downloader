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

const PRICING_DOCS: KnowledgeDocument[] = [
  { id: 'pricing-free', title: 'Free Plan', body: 'Every SavDown account gets 10 free SavCredits per day (up to 300 per month). No credit card required. Download up to 1080p HD with no watermarks.', url: '/pricing', category: 'pricing', baseWeight: 0.9 },
  { id: 'pricing-pro', title: 'Pro Plan', body: 'Pro plan costs 9.99/month or 89/year. Includes 1,000 SavCredits per month, 4K downloads, batch jobs, and priority processing.', url: '/pricing', category: 'pricing', baseWeight: 0.9 },
  { id: 'pricing-credits', title: 'SavCredits - How Credits Work', body: 'Proxy downloads cost 1 credit. 4K or server-side merges cost 2 credits. Image and PDF tool operations cost 1 credit. QR tools cost 1 credit. Free plan refills 10 credits daily. Purchased credits never expire. Credit packs: Starter 300cr, Creator 1000cr, Power 3000cr.', url: '/pricing', category: 'pricing', baseWeight: 0.9 },
  { id: 'pricing-lifetime', title: 'Lifetime Plan', body: 'One-time payment gives 30,000 lifetime SavCredits that never expire. Not unlimited - a finite credit bank.', url: '/pricing', category: 'pricing', baseWeight: 0.8 },
];

const PAGE_DOCS: KnowledgeDocument[] = [
  { id: 'page-about', title: 'About SavDown', body: 'SavDown is a free web-based toolkit for downloading media and processing files. Supports YouTube, TikTok, Instagram, Facebook, Pinterest, X. No watermarks, no signup required for basic use.', url: '/about', category: 'page', baseWeight: 0.7 },
  { id: 'page-privacy', title: 'Privacy Policy', body: 'SavDown does not store downloaded files. Files stream directly to users. SavDown does not log what you download. All connections use HTTPS.', url: '/privacy', category: 'page', baseWeight: 0.6 },
  { id: 'page-login', title: 'Signing In to SavDown', body: 'Sign in with Google, GitHub, or email+password at /login. If Google sign-in keeps returning to the login page, try clearing cookies or a different browser. Email sign-in requires the password you registered with.', url: '/login', category: 'page', baseWeight: 0.85 },
  { id: 'page-profile', title: 'Profile and Settings', body: 'Change profile name, avatar, email, or password at Workspace > Settings (/workspace/settings). Upload profile picture, update name, change password, or delete account there.', url: '/workspace/settings', category: 'page', baseWeight: 0.8 },
  { id: 'page-billing', title: 'Billing and Credits Balance', body: 'View credits balance, plan, and billing history at /workspace/billing. Upgrade plan or buy credit packs from /pricing.', url: '/workspace/billing', category: 'page', baseWeight: 0.8 },
  { id: 'page-pdf-limits', title: 'PDF Tool Batch File Limits', body: 'PDF tool batch limits by plan. Merge PDF: Free 5 files, Pro 30. Split PDF: Free 5, Pro 20. Compress PDF: Free 10, Pro 30. JPG to PDF: Free 10, Pro 50. PDF to JPG: Free 5, Pro 20. Max per file: 50 MB. Max total: 150 MB.', url: '/tools/merge-pdf', category: 'tool-guide', baseWeight: 0.85 },
  { id: 'page-upload-error', title: 'File Too Large or Upload Failed Error', body: 'File size limits: PDF tools max 50 MB per file and 150 MB combined. Video tools max 100 MB. Image tools max 25 MB. To fix: use a smaller file or compress first.', url: '/tools', category: 'tool-guide', baseWeight: 0.85 },
  { id: 'page-support', title: 'Contact Support', body: 'If you need help, use the Support button to chat with the SavDown team. You can also submit a support request by clicking Submit a support request.', url: '/contact', category: 'page', baseWeight: 0.7 },
];

const STOP_WORDS = new Set([
  'a','an','the','is','it','in','on','to','for','of','and','or','be','at','by','as',
  'do','we','my','me','so','if','no','up','can','has','how','its','was','are','our',
  'not','with','this','that','from','they','will','have','just','than','then','you',
  'your','what','when','why','where','which','who','been','would','could','should',
]);

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

function scoreDoc(doc: KnowledgeDocument, queryTokens: string[]): number {
  if (!queryTokens.length) return 0;
  const titleToks = tokenize(doc.title);
  const bodyToks = tokenize(doc.body);
  let score = 0;
  for (const qt of queryTokens) {
    if (titleToks.includes(qt)) score += 2;
    else if (titleToks.some(t => t.includes(qt) || qt.includes(t))) score += 1.2;
    if (bodyToks.includes(qt)) score += 1;
    else if (bodyToks.some(t => t.includes(qt) || qt.includes(t))) score += 0.5;
  }
  return (score / queryTokens.length) * doc.baseWeight;
}

let _corpus: KnowledgeDocument[] | null = null;

export function buildKnowledgeCorpus(): KnowledgeDocument[] {
  if (_corpus) return _corpus;
  const docs: KnowledgeDocument[] = [];

  for (const faq of homeFaqs) {
    docs.push({ id: 'site-faq-' + docs.length, title: faq.question, body: faq.answer, url: '/faq', category: 'site-faq', baseWeight: 0.9 });
  }

  for (const tool of tools) {
    for (const faq of tool.faq) {
      docs.push({ id: 'tool-faq-' + tool.slug + '-' + docs.length, title: tool.name + ': ' + faq.question, body: faq.answer, url: '/tools/' + tool.slug, category: 'tool-faq', baseWeight: 0.95 });
    }
  }

  for (const tool of catalog) {
    docs.push({ id: 'catalog-' + tool.slug, title: tool.name, body: tool.name + ' (' + tool.group + '): ' + tool.description, url: '/tools/' + tool.slug, category: 'tool-catalog', baseWeight: 0.6 });
  }

  for (const [slug, content] of Object.entries(toolContent)) {
    const toolName = catalog.find(t => t.slug === slug)?.name ?? slug;
    const href = '/tools/' + slug;
    docs.push({ id: 'guide-intro-' + slug, title: toolName + ' Overview', body: (content.whatItDoes + ' ' + content.introduction).slice(0, 500), url: href, category: 'tool-guide', baseWeight: 0.8 });
    if (content.bestPractices.length) docs.push({ id: 'guide-tips-' + slug, title: toolName + ' Tips and Best Practices', body: content.bestPractices.slice(0,5).join(' '), url: href, category: 'tool-guide', baseWeight: 0.75 });
    if (content.supportedPlatforms.length) docs.push({ id: 'guide-platforms-' + slug, title: toolName + ' Supported Formats', body: 'Supported: ' + content.supportedPlatforms.join(', '), url: href, category: 'tool-guide', baseWeight: 0.7 });
  }

  docs.push(...PRICING_DOCS);
  docs.push(...PAGE_DOCS);

  for (const post of blogPosts) {
    docs.push({ id: 'blog-' + post.slug, title: post.title, body: post.excerpt + ' Keywords: ' + [post.primaryKeyword, ...post.secondaryKeywords].join(', '), url: '/blog/' + post.slug, category: 'blog', baseWeight: 0.6 });
  }

  _corpus = docs;
  return docs;
}

export function retrieveKnowledge(query: string, opts: { topK?: number; minScore?: number } = {}): KnowledgeDocument[] {
  const { topK = 6, minScore = 0.1 } = opts;
  const corpus = buildKnowledgeCorpus();
  const tokens = tokenize(query);
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