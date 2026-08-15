'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, Search, Share2, BookOpen, ListChecks, Link2, ImageIcon,
  Settings2, Braces, HelpCircle, History, Monitor, Smartphone, Copy,
  CheckCircle2, AlertTriangle, XCircle, Loader2, Plus, Trash2, RotateCcw,
} from 'lucide-react';
import { siteConfig } from '@/config/site';
import { catalog } from '@/config/catalog';
import { analyzeContentJson } from '@/lib/content-studio/contentText';
import { analyzeSeo, type SeoCheck } from '@/lib/content-studio/seoAnalysis';
import { analyzeReadability } from '@/lib/content-studio/readability';
import { cn } from '@/lib/utils';
import type { StudioForm, FaqBlock, HowToBlock } from './types';
import { parseArray, parseFaq, parseHowTo } from './types';
import type { TiptapEditorHandle } from './TiptapEditor';

// ─── shared bits ─────────────────────────────────────────────────────────────

function CollapsibleSection({ id, title, icon: Icon, defaultOpen, badge, children }: {
  id: string; title: string; icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean; badge?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border-b border-border-light last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-surface/50 transition-colors"
        aria-expanded={open}
        aria-controls={`section-${id}`}
      >
        <Icon className="w-3.5 h-3.5 text-text-subtle shrink-0" />
        <span className="text-[12.5px] font-semibold text-text flex-1">{title}</span>
        {badge}
        <ChevronDown className={cn('w-3.5 h-3.5 text-text-subtle transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div id={`section-${id}`} className="px-4 pb-4 space-y-3">{children}</div>}
    </div>
  );
}

function scoreColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'stroke-emerald-500' };
  if (score >= 50) return { text: 'text-amber-600', bg: 'bg-amber-50', ring: 'stroke-amber-500' };
  return { text: 'text-rose-600', bg: 'bg-rose-50', ring: 'stroke-rose-500' };
}

function ScoreRing({ label, score }: { label: string; score: number }) {
  const c = scoreColor(score);
  const r = 16;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-11 h-11">
        <svg viewBox="0 0 40 40" className="w-11 h-11 -rotate-90">
          <circle cx="20" cy="20" r={r} className="stroke-border-light" strokeWidth="4" fill="none" />
          <circle cx="20" cy="20" r={r} className={c.ring} strokeWidth="4" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <span className={cn('absolute inset-0 flex items-center justify-center text-[11px] font-bold', c.text)}>{score}</span>
      </div>
      <span className="text-[10px] font-medium text-text-muted text-center leading-none">{label}</span>
    </div>
  );
}

function CheckRow({ check }: { check: SeoCheck }) {
  const Icon = check.status === 'good' ? CheckCircle2 : check.status === 'improvement' ? AlertTriangle : XCircle;
  const color = check.status === 'good' ? 'text-emerald-500' : check.status === 'improvement' ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className="flex items-start gap-2 text-[12px] leading-relaxed">
      <Icon className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', color)} />
      <span className="text-text-muted">{check.message}</span>
    </div>
  );
}

const fieldCls = 'w-full h-9 rounded-lg border border-border-light bg-white px-3 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';
const labelCls = 'block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5';

function CharCounter({ value, max, min }: { value: number; max: number; min?: number }) {
  const over = value > max;
  const under = min !== undefined && value < min && value > 0;
  return (
    <span className={cn('text-[10px]', over ? 'text-rose-600' : under ? 'text-amber-600' : 'text-text-subtle')}>
      {value}/{max}
    </span>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function SeoSidebar({
  form, setField, postId, editorHandle, onUploadFeaturedImage,
}: {
  form: StudioForm;
  setField: <K extends keyof StudioForm>(key: K, value: StudioForm[K]) => void;
  postId: string | null;
  editorHandle: React.RefObject<TiptapEditorHandle | null>;
  onUploadFeaturedImage: (file: File) => Promise<void>;
}) {
  const content = useMemo(() => analyzeContentJson(form.contentJson), [form.contentJson]);

  const seo = useMemo(() => analyzeSeo({
    title: form.title,
    seoTitle: form.seoTitle || form.title,
    slug: form.slug,
    metaDescription: form.metaDescription || form.excerpt || form.title,
    focusKeyphrase: form.focusKeyphrase,
    synonyms: parseArray(form.synonymsJson),
    coverImage: form.coverImage,
    coverAlt: form.coverAlt,
    canonicalUrl: form.canonicalUrl,
    content,
  }), [form.title, form.seoTitle, form.slug, form.metaDescription, form.excerpt, form.focusKeyphrase, form.synonymsJson, form.coverImage, form.coverAlt, form.canonicalUrl, content]);

  const readability = useMemo(() => analyzeReadability(content), [content]);

  const seoTitle = form.seoTitle || form.title || 'Your SEO title';
  const metaDescription = form.metaDescription || form.excerpt || 'Add a meta description to control how this article appears in search results.';
  const previewUrl = `${siteConfig.url.replace(/\/$/, '')}/blog/${form.slug || 'post-slug'}`;

  return (
    <div className="bg-white border border-border-light rounded-xl overflow-hidden sticky top-[60px] max-h-[calc(100vh-76px)] overflow-y-auto">
      {/* Score header */}
      <div className="flex items-center justify-around px-4 py-4 border-b border-border-light bg-surface/30">
        <ScoreRing label="SavDown SEO Score" score={seo.score} />
        <ScoreRing label="Readability" score={readability.score} />
      </div>
      <p className="text-[10px] text-text-subtle text-center px-4 pt-2 pb-1">
        In-house content quality score — not a Google ranking signal.
      </p>

      <CollapsibleSection id="keyphrase" title="Focus Keyphrase" icon={Search} defaultOpen>
        <div>
          <label className={labelCls}>Primary Focus Keyphrase</label>
          <input value={form.focusKeyphrase} onChange={(e) => setField('focusKeyphrase', e.target.value)} placeholder="e.g. youtube video downloader" className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Synonyms / Secondary Keywords (JSON array)</label>
          <input value={form.synonymsJson} onChange={(e) => setField('synonymsJson', e.target.value)} placeholder='["download youtube video"]' className={`${fieldCls} font-mono text-[11px]`} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="analysis" title="SEO Analysis" icon={ListChecks} defaultOpen
        badge={<span className="text-[10px] font-semibold text-text-subtle">{seo.problems.length} problems · {seo.improvements.length} to improve</span>}>
        {seo.problems.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-rose-600 uppercase tracking-wider">Problems ({seo.problems.length})</p>
            {seo.problems.map((c) => <CheckRow key={c.id} check={c} />)}
          </div>
        )}
        {seo.improvements.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Improvements ({seo.improvements.length})</p>
            {seo.improvements.map((c) => <CheckRow key={c.id} check={c} />)}
          </div>
        )}
        {seo.good.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Good results ({seo.good.length})</p>
            {seo.good.map((c) => <CheckRow key={c.id} check={c} />)}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection id="google" title="Google Search Preview" icon={Monitor} defaultOpen>
        <GooglePreview seoTitle={seoTitle} metaDescription={metaDescription} url={previewUrl} />
        <div>
          <div className="flex items-center justify-between">
            <label className={labelCls}>SEO Title</label>
            <CharCounter value={(form.seoTitle || form.title).length} max={60} min={30} />
          </div>
          <input value={form.seoTitle} onChange={(e) => setField('seoTitle', e.target.value)} placeholder={form.title || 'SEO title'} className={fieldCls} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className={labelCls}>Meta Description</label>
            <CharCounter value={(form.metaDescription || form.excerpt).length} max={156} min={80} />
          </div>
          <textarea value={form.metaDescription} onChange={(e) => setField('metaDescription', e.target.value)} placeholder={form.excerpt || 'Meta description'} rows={3} className={`${fieldCls} h-auto py-2 resize-none`} />
        </div>
        <div>
          <label className={labelCls}>Slug</label>
          <div className="flex items-center gap-1 text-[13px]">
            <span className="text-text-subtle shrink-0">/blog/</span>
            <input value={form.slug} onChange={(e) => setField('slug', e.target.value)} className={`${fieldCls} font-mono`} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="social" title="Social Preview" icon={Share2}>
        <SocialPreview form={form} setField={setField} />
      </CollapsibleSection>

      <CollapsibleSection id="readability" title="Readability" icon={BookOpen}>
        {readability.all.length === 0 ? (
          <p className="text-[12px] text-text-subtle">Write some content to see a readability analysis.</p>
        ) : (
          <>
            {readability.improvements.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Improvements ({readability.improvements.length})</p>
                {readability.improvements.map((c) => <CheckRow key={c.id} check={c} />)}
              </div>
            )}
            {readability.good.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Good results ({readability.good.length})</p>
                {readability.good.map((c) => <CheckRow key={c.id} check={c} />)}
              </div>
            )}
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection id="quality" title="Content Quality" icon={ListChecks}>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <Stat label="Words" value={content.wordCount} />
          <Stat label="Headings" value={content.headings.length} />
          <Stat label="Images" value={content.images.length} />
          <Stat label="Internal links" value={content.internalLinks} />
          <Stat label="External links" value={content.externalLinks} />
          <Stat label="Reading time" value={`${content.readingTimeMinutes} min`} />
        </div>
        {content.wordCount > 0 && content.wordCount < 300 && (
          <p className="text-[11px] text-amber-600">Thin content — most guides need at least 300–600 words to be useful. For in-depth guides, aim for 1,500+ words only when the topic genuinely calls for that depth. Don&apos;t pad just to hit a number.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection id="toc" title="Table of Contents" icon={ListChecks}>
        {content.headings.length === 0 ? (
          <p className="text-[12px] text-text-subtle">No H2/H3/H4 headings yet — add some to generate a table of contents on the public article.</p>
        ) : (
          <div className="space-y-1">
            {content.headings.map((h) => (
              <p key={h.id} className="text-[12px] text-text-muted truncate" style={{ paddingLeft: (h.level - 2) * 12 }}>
                {h.text}
              </p>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection id="links" title="Internal Linking" icon={Link2}>
        <InternalLinking editorHandle={editorHandle} />
      </CollapsibleSection>

      <CollapsibleSection id="images" title="Featured Image" icon={ImageIcon}>
        <FeaturedImagePanel form={form} setField={setField} onUpload={onUploadFeaturedImage} />
      </CollapsibleSection>

      <CollapsibleSection id="advanced" title="Advanced SEO" icon={Settings2}>
        <div>
          <label className={labelCls}>Allow search engines to show this post?</label>
          <select value={form.noIndex ? 'noindex' : 'index'} onChange={(e) => setField('noIndex', e.target.value === 'noindex')} className={fieldCls}>
            <option value="index">Index (default)</option>
            <option value="noindex">Noindex</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Should search engines follow links on this post?</label>
          <select value={form.noFollow ? 'nofollow' : 'follow'} onChange={(e) => setField('noFollow', e.target.value === 'nofollow')} className={fieldCls}>
            <option value="follow">Follow (default)</option>
            <option value="nofollow">Nofollow</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Meta Robots Advanced</label>
          <input value={form.metaRobotsAdvanced} onChange={(e) => setField('metaRobotsAdvanced', e.target.value)} placeholder="e.g. max-snippet:-1" className={fieldCls} />
        </div>
        <div>
          <label className={labelCls}>Canonical URL</label>
          <input value={form.canonicalUrl} onChange={(e) => setField('canonicalUrl', e.target.value)} placeholder={previewUrl} className={fieldCls} />
          <p className="mt-1 text-[10px] text-text-subtle">Defaults to this article&apos;s own URL — the safe setting for normal posts.</p>
        </div>
        <div>
          <label className={labelCls}>Breadcrumb Title</label>
          <input value={form.breadcrumbTitle} onChange={(e) => setField('breadcrumbTitle', e.target.value)} placeholder={form.title} className={fieldCls} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="schema" title="Schema" icon={Braces}>
        <div>
          <label className={labelCls}>Page Type</label>
          <select value={form.schemaType} onChange={(e) => setField('schemaType', e.target.value)} className={fieldCls}>
            <option value="BlogPosting">Blog Posting (default)</option>
            <option value="Article">Article</option>
          </select>
        </div>
        <p className="text-[11px] text-text-muted leading-relaxed">
          SavDown automatically generates {form.schemaType || 'BlogPosting'} + BreadcrumbList structured data for this article
          {parseFaq(form.faqJson).some((f) => f.question) ? ', plus FAQPage schema from the blocks below' : ''}
          {parseHowTo(form.howToJson).some((h) => h.title) ? ', plus HowTo schema from the steps below' : ''}. No manual JSON-LD needed.
        </p>
      </CollapsibleSection>

      <CollapsibleSection id="faq" title="FAQ / How-To Blocks" icon={HelpCircle}>
        <FaqHowToEditor form={form} setField={setField} />
      </CollapsibleSection>

      {postId && (
        <CollapsibleSection id="history" title="Version History" icon={History}>
          <VersionHistory postId={postId} />
        </CollapsibleSection>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-surface/60 rounded-lg px-2.5 py-2">
      <p className="text-[10px] text-text-subtle">{label}</p>
      <p className="text-[13px] font-semibold text-text">{value}</p>
    </div>
  );
}

// ─── Google preview ──────────────────────────────────────────────────────────

function GooglePreview({ seoTitle, metaDescription, url }: { seoTitle: string; metaDescription: string; url: string }) {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop');
  const titleMax = mode === 'desktop' ? 60 : 78;
  const descMax = mode === 'desktop' ? 156 : 120;
  const displayTitle = seoTitle.length > titleMax ? `${seoTitle.slice(0, titleMax - 1)}…` : seoTitle;
  const displayDesc = metaDescription.length > descMax ? `${metaDescription.slice(0, descMax - 1)}…` : metaDescription;

  return (
    <div>
      <div className="flex gap-1 mb-2">
        <button type="button" onClick={() => setMode('desktop')} className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium', mode === 'desktop' ? 'bg-text text-white' : 'bg-surface text-text-muted')}>
          <Monitor className="w-3 h-3" /> Desktop
        </button>
        <button type="button" onClick={() => setMode('mobile')} className={cn('flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium', mode === 'mobile' ? 'bg-text text-white' : 'bg-surface text-text-muted')}>
          <Smartphone className="w-3 h-3" /> Mobile
        </button>
      </div>
      <div className="bg-surface/60 rounded-lg p-3">
        <p className="text-[10px] text-text-subtle mb-1">savdown.com</p>
        <p className="text-[15px] text-blue-700 leading-snug truncate">{displayTitle}</p>
        <p className="text-[11px] text-emerald-700 truncate">{url}</p>
        <p className="text-[12px] text-text-muted leading-snug mt-0.5 line-clamp-2">{displayDesc}</p>
      </div>
      <p className="mt-1.5 text-[10px] text-text-subtle">Approximation only — Google may rewrite your title or description in real results.</p>
    </div>
  );
}

// ─── Social preview ──────────────────────────────────────────────────────────

function SocialPreview({ form, setField }: { form: StudioForm; setField: <K extends keyof StudioForm>(key: K, value: StudioForm[K]) => void }) {
  const [network, setNetwork] = useState<'facebook' | 'x' | 'linkedin'>('facebook');
  const title = form.ogTitle || form.seoTitle || form.title || 'Article title';
  const description = form.ogDescription || form.metaDescription || form.excerpt || '';
  const image = form.ogImage || form.coverImage;
  const domain = siteConfig.url.replace(/^https?:\/\//, '');

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {(['facebook', 'x', 'linkedin'] as const).map((n) => (
          <button key={n} type="button" onClick={() => setNetwork(n)}
            className={cn('flex-1 px-2 py-1 rounded-md text-[11px] font-medium capitalize', network === n ? 'bg-text text-white' : 'bg-surface text-text-muted')}>
            {n === 'x' ? 'X' : n}
          </button>
        ))}
      </div>
      <div className="border border-border-light rounded-lg overflow-hidden">
        <div className="h-32 bg-surface flex items-center justify-center overflow-hidden">
          {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-text-subtle" />}
        </div>
        <div className="p-2.5">
          <p className="text-[10px] text-text-subtle uppercase">{domain}</p>
          <p className="text-[13px] font-semibold text-text line-clamp-1">{title}</p>
          <p className="text-[11px] text-text-muted line-clamp-2">{description}</p>
        </div>
      </div>
      <div>
        <label className={labelCls}>Social Title (optional override)</label>
        <input value={form.ogTitle} onChange={(e) => setField('ogTitle', e.target.value)} placeholder={title} className={fieldCls} />
      </div>
      <div>
        <label className={labelCls}>Social Description (optional override)</label>
        <textarea value={form.ogDescription} onChange={(e) => setField('ogDescription', e.target.value)} placeholder={description} rows={2} className={`${fieldCls} h-auto py-2 resize-none`} />
      </div>
      <div>
        <label className={labelCls}>Social Image URL (optional override)</label>
        <input value={form.ogImage} onChange={(e) => setField('ogImage', e.target.value)} placeholder={form.coverImage || '/og-default.svg'} className={fieldCls} />
      </div>
    </div>
  );
}

// ─── Internal linking ────────────────────────────────────────────────────────

function InternalLinking({ editorHandle }: { editorHandle: React.RefObject<TiptapEditorHandle | null> }) {
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<{ title: string; slug: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setPosts([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/content?pageSize=6&search=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => { if (d.ok) setPosts(d.data.posts); })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const tools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog.filter((t) => t.name.toLowerCase().includes(q) || t.slug.includes(q)).slice(0, 6);
  }, [query]);

  function copy(url: string) {
    navigator.clipboard?.writeText(`${siteConfig.url.replace(/\/$/, '')}${url}`).catch(() => undefined);
  }

  function insert(url: string, text: string) {
    editorHandle.current?.appendLink(url, text);
  }

  return (
    <div className="space-y-2">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools or articles…" className={fieldCls} />
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-text-subtle" />}
      {tools.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-text-subtle uppercase">Tools</p>
          {tools.map((t) => (
            <LinkRow key={t.slug} label={t.name} url={`/tools/${t.slug}`} onCopy={() => copy(`/tools/${t.slug}`)} onInsert={() => insert(`/tools/${t.slug}`, t.name)} />
          ))}
        </div>
      )}
      {posts.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-text-subtle uppercase">Articles</p>
          {posts.map((p) => (
            <LinkRow key={p.slug} label={p.title} url={`/blog/${p.slug}`} onCopy={() => copy(`/blog/${p.slug}`)} onInsert={() => insert(`/blog/${p.slug}`, p.title)} />
          ))}
        </div>
      )}
    </div>
  );
}

function LinkRow({ label, url, onCopy, onInsert }: { label: string; url: string; onCopy: () => void; onInsert: () => void }) {
  return (
    <div className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-surface/60">
      <span className="flex-1 min-w-0 text-[12px] text-text truncate">{label}</span>
      <button type="button" title="Insert link at end" onClick={onInsert} className="p-1 rounded text-text-muted hover:text-primary"><Plus className="w-3.5 h-3.5" /></button>
      <button type="button" title="Copy URL" onClick={onCopy} className="p-1 rounded text-text-muted hover:text-primary"><Copy className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ─── Featured image ──────────────────────────────────────────────────────────

function FeaturedImagePanel({ form, setField, onUpload }: {
  form: StudioForm; setField: <K extends keyof StudioForm>(key: K, value: StudioForm[K]) => void; onUpload: (file: File) => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try { await onUpload(file); } finally { setUploading(false); }
  }

  return (
    <div className="space-y-2">
      <div className="aspect-video rounded-lg bg-surface border border-border-light overflow-hidden flex items-center justify-center">
        {form.coverImage ? <img src={form.coverImage} alt={form.coverAlt} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-text-subtle" />}
      </div>
      <label className="flex items-center justify-center gap-2 h-8 rounded-lg border border-dashed border-border text-[12px] text-text-muted hover:border-primary/40 hover:text-primary cursor-pointer transition-colors">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Upload image'}
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      </label>
      <div>
        <label className={labelCls}>Image URL</label>
        <input value={form.coverImage} onChange={(e) => setField('coverImage', e.target.value)} placeholder="/images/blog/cover.webp" className={fieldCls} />
      </div>
      <div>
        <label className={labelCls}>Alt Text</label>
        <input value={form.coverAlt} onChange={(e) => setField('coverAlt', e.target.value)} placeholder="Descriptive alt text" className={fieldCls} />
        {form.coverImage && !form.coverAlt && (
          <p className="mt-1 text-[10px] text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Missing alt text</p>
        )}
      </div>
    </div>
  );
}

// ─── FAQ / HowTo ─────────────────────────────────────────────────────────────

function FaqHowToEditor({ form, setField }: { form: StudioForm; setField: <K extends keyof StudioForm>(key: K, value: StudioForm[K]) => void }) {
  const faqs = parseFaq(form.faqJson);
  const steps = parseHowTo(form.howToJson);

  function updateFaqs(next: FaqBlock[]) { setField('faqJson', JSON.stringify(next)); }
  function updateSteps(next: HowToBlock[]) { setField('howToJson', JSON.stringify(next)); }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">FAQ</p>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div key={i} className="border border-border-light rounded-lg p-2 space-y-1.5">
              <input value={f.question} onChange={(e) => updateFaqs(faqs.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} placeholder="Question" className={fieldCls} />
              <textarea value={f.answer} onChange={(e) => updateFaqs(faqs.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))} placeholder="Answer" rows={2} className={`${fieldCls} h-auto py-2 resize-none`} />
              <button type="button" onClick={() => updateFaqs(faqs.filter((_, j) => j !== i))} className="text-[11px] text-rose-600 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => updateFaqs([...faqs, { question: '', answer: '' }])} className="text-[12px] text-primary flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add question</button>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">How-To Steps</p>
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="border border-border-light rounded-lg p-2 space-y-1.5">
              <input value={s.title} onChange={(e) => updateSteps(steps.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Step title" className={fieldCls} />
              <textarea value={s.description} onChange={(e) => updateSteps(steps.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Step description" rows={2} className={`${fieldCls} h-auto py-2 resize-none`} />
              <button type="button" onClick={() => updateSteps(steps.filter((_, j) => j !== i))} className="text-[11px] text-rose-600 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>
            </div>
          ))}
          <button type="button" onClick={() => updateSteps([...steps, { title: '', description: '' }])} className="text-[12px] text-primary flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add step</button>
        </div>
      </div>
      <p className="text-[10px] text-text-subtle">Schema for these is only generated once a block has content — empty sections are ignored.</p>
    </div>
  );
}

// ─── Version history ─────────────────────────────────────────────────────────

type Revision = { id: string; changeSummary: string | null; authorEmail: string | null; createdAt: string };

function VersionHistory({ postId }: { postId: string }) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/admin/content/${postId}/revisions`).then((r) => r.json()).then((d) => { if (d.ok) setRevisions(d.data); }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function restore(id: string) {
    if (!window.confirm('Restore this version? Your current unsaved changes will be replaced.')) return;
    setRestoring(id);
    try {
      const r = await fetch(`/api/admin/content/${postId}/revisions/${id}/restore`, { method: 'POST' });
      const d = await r.json().catch(() => null);
      if (d?.ok) window.location.reload();
    } finally { setRestoring(null); }
  }

  if (loading) return <Loader2 className="w-3.5 h-3.5 animate-spin text-text-subtle" />;
  if (revisions.length === 0) return <p className="text-[12px] text-text-subtle">No previous versions yet — saved every time you edit this post.</p>;

  return (
    <div className="space-y-1.5">
      {revisions.map((r) => (
        <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface/60">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-text truncate">{r.changeSummary || 'Edit'}</p>
            <p className="text-[10px] text-text-subtle">{new Date(r.createdAt).toLocaleString()}{r.authorEmail ? ` · ${r.authorEmail}` : ''}</p>
          </div>
          <button type="button" onClick={() => restore(r.id)} disabled={restoring === r.id} className="p-1 rounded text-text-muted hover:text-primary" title="Restore">
            {restoring === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          </button>
        </div>
      ))}
    </div>
  );
}
