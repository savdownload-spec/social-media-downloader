'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Save, Eye, CalendarClock, Send, Check, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { StatusBadge } from '../AdminUI';
import { TiptapEditor, type TiptapEditorHandle, type EditorStats } from './TiptapEditor';
import { SeoSidebar } from './SeoSidebar';
import { useAutosave } from './hooks/useAutosave';
import { EMPTY_STUDIO_FORM, type StudioForm } from './types';
import type { TiptapNode } from '@/lib/content-studio/contentText';
import { cn } from '@/lib/utils';

export type AdminPost = {
  id: string; slug: string; title: string; excerpt: string | null;
  content: string; author: string; tagsJson: string; category: string;
  coverImage: string | null; coverAlt: string | null; ogImage: string | null;
  primaryKeyword: string | null; secondaryKeywordsJson: string;
  canonicalUrl: string | null; toolSlug: string | null;
  readingTimeMinutes: number | null; published: boolean;
  publishedAt: string | null; createdAt: string; updatedAt: string;
  contentJson?: unknown;
  seoTitle?: string | null; metaDescription?: string | null;
  focusKeyphrase?: string | null; synonymsJson?: string | null;
  noIndex?: boolean; noFollow?: boolean; metaRobotsAdvanced?: string | null;
  breadcrumbTitle?: string | null; schemaType?: string | null;
  faqJson?: string | null; howToJson?: string | null;
  ogTitle?: string | null; ogDescription?: string | null;
  scheduledAt?: string | null; seoScore?: number | null; readabilityScore?: number | null;
  wordCount?: number | null; internalLinks?: number | null; externalLinks?: number | null;
};

export function postToForm(post: AdminPost): StudioForm {
  return {
    title: post.title, slug: post.slug, excerpt: post.excerpt ?? '',
    content: post.content ?? '', contentJson: (post.contentJson as TiptapNode) ?? null,
    author: post.author, tagsJson: post.tagsJson, category: post.category || 'Guides',
    coverImage: post.coverImage ?? '', coverAlt: post.coverAlt ?? '', ogImage: post.ogImage ?? '',
    primaryKeyword: post.primaryKeyword ?? '', secondaryKeywordsJson: post.secondaryKeywordsJson || '[]',
    canonicalUrl: post.canonicalUrl ?? '', toolSlug: post.toolSlug ?? '',
    readingTimeMinutes: post.readingTimeMinutes ? String(post.readingTimeMinutes) : '',
    published: post.published,
    seoTitle: post.seoTitle ?? '', metaDescription: post.metaDescription ?? '',
    focusKeyphrase: post.focusKeyphrase ?? '', synonymsJson: post.synonymsJson || '[]',
    noIndex: !!post.noIndex, noFollow: !!post.noFollow,
    metaRobotsAdvanced: post.metaRobotsAdvanced ?? '', breadcrumbTitle: post.breadcrumbTitle ?? '',
    schemaType: post.schemaType || 'BlogPosting', faqJson: post.faqJson || '[]', howToJson: post.howToJson || '[]',
    ogTitle: post.ogTitle ?? '', ogDescription: post.ogDescription ?? '',
    scheduledAt: post.scheduledAt ? post.scheduledAt.slice(0, 16) : '',
  };
}

function autoSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function ContentStudioShell({
  initialPost, onClose, onSaved,
}: {
  initialPost: AdminPost | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<StudioForm>(() => initialPost ? postToForm(initialPost) : EMPTY_STUDIO_FORM);
  const [postId, setPostId] = useState<string | null>(initialPost?.id ?? null);
  const [wasPublished] = useState(!!initialPost?.published);
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [stats, setStats] = useState<EditorStats>({ wordCount: 0, charCount: 0, readingTimeMinutes: 1, headingCount: 0, imageCount: 0, linkCount: 0 });
  const editorHandle = useRef<TiptapEditorHandle>(null);
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const setField = useCallback(<K extends keyof StudioForm>(key: K, value: StudioForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const buildPayload = useCallback((f: StudioForm, publishOverride?: boolean) => ({
    title: f.title,
    slug: f.slug,
    excerpt: f.excerpt || undefined,
    content: editorHandle.current?.getMarkdown() || f.content || ' ',
    contentJson: f.contentJson,
    author: f.author,
    tagsJson: f.tagsJson,
    category: f.category,
    coverImage: f.coverImage || undefined,
    coverAlt: f.coverAlt || undefined,
    ogImage: f.ogImage || undefined,
    primaryKeyword: f.focusKeyphrase || f.primaryKeyword || undefined,
    secondaryKeywordsJson: f.secondaryKeywordsJson,
    canonicalUrl: f.canonicalUrl || undefined,
    toolSlug: f.toolSlug || undefined,
    readingTimeMinutes: f.readingTimeMinutes ? Number(f.readingTimeMinutes) : stats.readingTimeMinutes,
    published: publishOverride ?? f.published,
    seoTitle: f.seoTitle || undefined,
    metaDescription: f.metaDescription || undefined,
    focusKeyphrase: f.focusKeyphrase || undefined,
    synonymsJson: f.synonymsJson,
    noIndex: f.noIndex,
    noFollow: f.noFollow,
    metaRobotsAdvanced: f.metaRobotsAdvanced || undefined,
    breadcrumbTitle: f.breadcrumbTitle || undefined,
    schemaType: f.schemaType || undefined,
    faqJson: f.faqJson,
    howToJson: f.howToJson,
    ogTitle: f.ogTitle || undefined,
    ogDescription: f.ogDescription || undefined,
    scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : null,
  }), [stats.readingTimeMinutes]);

  const persist = useCallback(async (f: StudioForm, opts?: { publishOverride?: boolean; changeSummary?: string }) => {
    const payload = { ...buildPayload(f, opts?.publishOverride), changeSummary: opts?.changeSummary };
    const url = postId ? `/api/admin/content/${postId}` : '/api/admin/content';
    const method = postId ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => null);
    if (!data?.ok) throw new Error(data?.error || 'Save failed');
    if (!postId && data.data?.id) setPostId(data.data.id);
    return data.data;
  }, [postId, buildPayload]);

  const autosaveEnabled = !!form.title && !!form.slug;
  const { status: autosaveStatus, retry: retryAutosave } = useAutosave(form, async (snapshot) => {
    await persist(snapshot, { changeSummary: 'Autosave' });
  }, { enabled: autosaveEnabled });

  async function handleSlugGuard(): Promise<boolean> {
    if (!initialPost || !wasPublished) return true;
    if (form.slug === initialPost.slug) return true;
    return confirm({
      title: 'Change the URL of a published post?',
      description: `This post is live at /blog/${initialPost.slug}. Changing the slug to /blog/${form.slug} will break that URL for anyone who has it bookmarked or linked — there is no automatic redirect. Continue?`,
      confirmLabel: 'Change slug',
      variant: 'danger',
    });
  }

  async function handleSaveDraft() {
    if (!(await handleSlugGuard())) return;
    setSaving(true);
    try {
      await persist(form, { publishOverride: false, changeSummary: 'Manual save (draft)' });
      success('Draft saved');
      onSaved();
    } catch (e) {
      toastError('Save failed', e instanceof Error ? e.message : undefined);
    } finally { setSaving(false); }
  }

  async function handlePublish() {
    if (!(await handleSlugGuard())) return;
    setSaving(true);
    try {
      await persist(form, { publishOverride: true, changeSummary: 'Published' });
      setField('published', true);
      success('Post published');
      onSaved();
    } catch (e) {
      toastError('Publish failed', e instanceof Error ? e.message : undefined);
    } finally { setSaving(false); }
  }

  async function handleSchedule() {
    if (!form.scheduledAt) { toastError('Pick a schedule date first'); return; }
    if (!(await handleSlugGuard())) return;
    setSaving(true);
    try {
      await persist(form, { publishOverride: false, changeSummary: 'Scheduled' });
      success(`Scheduled for ${new Date(form.scheduledAt).toLocaleString()}`);
      onSaved();
    } catch (e) {
      toastError('Schedule failed', e instanceof Error ? e.message : undefined);
    } finally { setSaving(false); }
  }

  function handlePreview() {
    if (!form.slug) return;
    window.open(`/blog/${form.slug}`, '_blank', 'noopener,noreferrer');
  }

  async function handleDiscard() {
    // Autosave may have already created a DB row for a brand-new article
    // the user never meant to keep — in that case "Discard" deletes it.
    // Editing an existing article never deletes it here; it just closes
    // without persisting further, leaving the last-saved version intact.
    const isUnsavedNewDraft = !initialPost && !!postId;
    if (isUnsavedNewDraft) {
      const ok = await confirm({
        title: 'Discard this draft?',
        description: 'This article was never published and will be permanently deleted.',
        confirmLabel: 'Discard',
        variant: 'danger',
      });
      if (!ok) return;
      setDiscarding(true);
      try {
        await fetch(`/api/admin/content/${postId}`, { method: 'DELETE' });
        onSaved();
        onClose();
      } catch {
        toastError('Could not discard the draft — please try again.');
      } finally {
        setDiscarding(false);
      }
      return;
    }
    if (!initialPost) {
      onClose();
      return;
    }
    const ok = await confirm({
      title: 'Discard unsaved changes?',
      description: 'Any edits since the last autosave will be lost. The article itself will not be deleted.',
      confirmLabel: 'Discard changes',
    });
    if (!ok) return;
    onClose();
  }

  const status = useMemo(() => {
    if (form.published) return 'PUBLISHED';
    if (form.scheduledAt && new Date(form.scheduledAt) > new Date()) return 'SCHEDULED';
    return 'DRAFT';
  }, [form.published, form.scheduledAt]);

  return (
    <div className="min-h-screen bg-[#F7F7FB]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-border-light px-4 lg:px-6 h-14 flex items-center gap-3">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface text-text-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-text truncate">{postId ? 'Edit Article' : 'New Article'}</h1>
        </div>
        <AutosaveIndicator status={autosaveStatus} onRetry={retryAutosave} enabled={autosaveEnabled} />
        <StatusBadge status={status} dot />
        <Button variant="ghost" size="sm" onClick={handleDiscard} loading={discarding} className="text-rose-600 hover:bg-rose-50">
          <Trash2 className="w-3.5 h-3.5 mr-1" /> Discard
        </Button>
        <Button variant="outline" size="sm" onClick={handlePreview} disabled={!form.slug}>
          <Eye className="w-3.5 h-3.5 mr-1" /> Preview
        </Button>
        <Button variant="secondary" size="sm" onClick={handleSaveDraft} loading={saving} disabled={!form.title || !form.slug}>
          <Save className="w-3.5 h-3.5 mr-1" /> Save Draft
        </Button>
        <Button variant="primary" size="sm" onClick={handlePublish} loading={saving} disabled={!form.title || !form.slug}>
          <Send className="w-3.5 h-3.5 mr-1" /> {form.published ? 'Update' : 'Publish'}
        </Button>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Main column */}
          <div className="space-y-5 min-w-0">
            <ArticleHeaderFields form={form} setField={setField} onScheduleClick={handleSchedule} scheduling={saving} />

            <TiptapEditor
              ref={editorHandle}
              initialContentJson={form.contentJson}
              initialMarkdown={!form.contentJson ? form.content : undefined}
              onChange={(json) => setField('contentJson', json)}
              onStats={setStats}
            />

            <StatsBar stats={stats} />
          </div>

          {/* SEO sidebar */}
          <div className="min-w-0">
            <SeoSidebar
              form={form}
              setField={setField}
              postId={postId}
              editorHandle={editorHandle}
              onUploadFeaturedImage={async (file) => {
                const body = new FormData();
                body.append('file', file);
                try {
                  const res = await fetch('/api/admin/content/media', { method: 'POST', body });
                  const data = await res.json().catch(() => null);
                  if (data?.ok) {
                    setField('coverImage', data.data.url);
                    if (!form.ogImage) setField('ogImage', data.data.url);
                  } else {
                    toastError('Image upload failed', data?.error || `Server returned ${res.status}. The image was not saved.`);
                  }
                } catch {
                  toastError('Image upload failed', 'Could not reach the server. Check your connection and try again.');
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AutosaveIndicator({ status, onRetry, enabled }: { status: string; onRetry: () => void; enabled: boolean }) {
  if (!enabled) return null;
  if (status === 'saving') return <span className="flex items-center gap-1 text-[11px] text-text-subtle"><RefreshCw className="w-3 h-3 animate-spin" /> Saving…</span>;
  if (status === 'saved') return <span className="flex items-center gap-1 text-[11px] text-emerald-600"><Check className="w-3 h-3" /> Saved</span>;
  if (status === 'error') return (
    <button onClick={onRetry} className="flex items-center gap-1 text-[11px] text-rose-600 hover:underline">
      <AlertCircle className="w-3 h-3" /> Retry
    </button>
  );
  return null;
}

function ArticleHeaderFields({ form, setField, onScheduleClick, scheduling }: {
  form: StudioForm;
  setField: <K extends keyof StudioForm>(key: K, value: StudioForm[K]) => void;
  onScheduleClick: () => void;
  scheduling: boolean;
}) {
  return (
    <div className="bg-white border border-border-light rounded-xl p-4 lg:p-5 space-y-4">
      <input
        value={form.title}
        onChange={(e) => setField('title', e.target.value)}
        onBlur={() => { if (form.title && !form.slug) setField('slug', autoSlug(form.title)); }}
        placeholder="Article title…"
        className="w-full text-2xl font-bold text-text bg-transparent border-0 outline-none placeholder:text-text-subtle"
      />
      <div className="flex items-center gap-2 text-[13px]">
        <span className="text-text-muted shrink-0">/blog/</span>
        <input value={form.slug} onChange={(e) => setField('slug', e.target.value)} placeholder="post-slug" className="flex-1 font-mono text-text-muted bg-transparent border-0 outline-none placeholder:text-text-subtle" />
      </div>
      <textarea
        value={form.excerpt}
        onChange={(e) => setField('excerpt', e.target.value)}
        placeholder="Short excerpt shown on blog cards and used as a meta description fallback…"
        rows={2}
        className="w-full text-[13px] text-text bg-surface/50 rounded-lg p-3 border-0 outline-none placeholder:text-text-subtle resize-none"
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Author"><input value={form.author} onChange={(e) => setField('author', e.target.value)} className={miniField} /></Field>
        <Field label="Category"><input value={form.category} onChange={(e) => setField('category', e.target.value)} className={miniField} /></Field>
        <Field label="Tags (JSON)"><input value={form.tagsJson} onChange={(e) => setField('tagsJson', e.target.value)} className={cn(miniField, 'font-mono text-[11px]')} /></Field>
        <Field label="Tool Slug (CTA)"><input value={form.toolSlug} onChange={(e) => setField('toolSlug', e.target.value)} className={cn(miniField, 'font-mono text-[11px]')} /></Field>
      </div>
      <div className="flex items-center gap-3 pt-1 border-t border-border-light">
        <Field label="Publish / Schedule Date">
          <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setField('scheduledAt', e.target.value)} className={miniField} />
        </Field>
        <Button variant="outline" size="sm" className="mt-4" onClick={onScheduleClick} loading={scheduling} disabled={!form.scheduledAt}>
          <CalendarClock className="w-3.5 h-3.5 mr-1" /> Schedule
        </Button>
      </div>
    </div>
  );
}

const miniField = 'w-full h-8 rounded-lg border border-border-light bg-white px-2.5 text-[12px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatsBar({ stats }: { stats: EditorStats }) {
  const items = [
    ['Words', stats.wordCount],
    ['Characters', stats.charCount],
    ['Reading time', `${stats.readingTimeMinutes} min`],
    ['Headings', stats.headingCount],
    ['Images', stats.imageCount],
    ['Links', stats.linkCount],
  ] as const;
  return (
    <div className="flex flex-wrap gap-4 px-1 text-[11px] text-text-subtle">
      {items.map(([label, value]) => (
        <span key={label}><strong className="text-text-muted font-semibold">{value}</strong> {label}</span>
      ))}
    </div>
  );
}
