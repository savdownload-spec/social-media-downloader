'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td, StatusBadge,
  Pagination, FilterBar, FilterTab, EmptyState, ErrorState,
  ActionButton, Skeleton,
} from './AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
  Pencil, Trash2, Eye, EyeOff, Plus, ArrowLeft, Save,
  FileText, Calendar, User, Tag, Globe, Image, Search,
  AlertCircle, CheckCircle, Type,
} from 'lucide-react';

type Post = {
  id: string; slug: string; title: string; excerpt: string | null;
  content: string; author: string; tagsJson: string; category: string;
  coverImage: string | null; coverAlt: string | null; ogImage: string | null;
  primaryKeyword: string | null; secondaryKeywordsJson: string;
  canonicalUrl: string | null; toolSlug: string | null;
  readingTimeMinutes: number | null; published: boolean;
  publishedAt: string | null; createdAt: string; updatedAt: string;
};

type PostForm = {
  title: string; slug: string; excerpt: string; content: string;
  author: string; tagsJson: string; category: string;
  coverImage: string; coverAlt: string; ogImage: string;
  primaryKeyword: string; secondaryKeywordsJson: string;
  canonicalUrl: string; toolSlug: string; readingTimeMinutes: string;
  published: boolean;
};

const EMPTY_FORM: PostForm = {
  title: '', slug: '', excerpt: '', content: '', author: 'Editorial Team',
  tagsJson: '[]', category: 'Guides', coverImage: '', coverAlt: '',
  ogImage: '', primaryKeyword: '', secondaryKeywordsJson: '[]',
  canonicalUrl: '', toolSlug: '', readingTimeMinutes: '', published: false,
};

const STATUS_FILTERS = ['ALL', 'published', 'draft'];

const fieldCls = 'w-full h-9 rounded-lg border border-border-light bg-white px-3 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';
const labelCls = 'block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5';

export function AdminContentClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { success, error: err } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    if (filter !== 'ALL') params.set('status', filter);
    fetch(`/api/admin/content?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setPosts(d.data.posts); setTotal(d.data.total); setTotalPages(d.data.totalPages); } else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filter]);

  function openCreate() { setForm(EMPTY_FORM); setEditId(null); setEditorOpen(true); }
  function openEdit(post: Post) {
    setForm({
      title: post.title, slug: post.slug, excerpt: post.excerpt ?? '',
      content: post.content ?? '', author: post.author, tagsJson: post.tagsJson,
      category: post.category || 'Guides', coverImage: post.coverImage ?? '',
      coverAlt: post.coverAlt ?? '', ogImage: post.ogImage ?? '',
      primaryKeyword: post.primaryKeyword ?? '',
      secondaryKeywordsJson: post.secondaryKeywordsJson || '[]',
      canonicalUrl: post.canonicalUrl ?? '', toolSlug: post.toolSlug ?? '',
      readingTimeMinutes: post.readingTimeMinutes ? String(post.readingTimeMinutes) : '',
      published: post.published,
    });
    setEditId(post.id);
    setEditorOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const url = editId ? `/api/admin/content/${editId}` : '/api/admin/content';
      const method = editId ? 'PATCH' : 'POST';
      const payload = { ...form, readingTimeMinutes: form.readingTimeMinutes ? Number(form.readingTimeMinutes) : undefined };
      const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => null);
      if (!data?.ok) { err('Save failed', data?.error); return; }
      success(editId ? 'Post updated' : 'Post created');
      setEditorOpen(false); load();
    } finally { setSaving(false); }
  }

  async function togglePublish(post: Post) {
    const r = await fetch(`/api/admin/content/${post.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ published: !post.published }) });
    const d = await r.json().catch(() => null);
    if (d?.ok) { success(post.published ? 'Unpublished' : 'Published'); load(); } else err('Failed');
  }

  async function handleDelete(post: Post) {
    const ok = await confirm({ title: `Delete "${post.title}"?`, description: 'This action cannot be undone. The post will be permanently removed.', confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    const r = await fetch(`/api/admin/content/${post.id}`, { method: 'DELETE' });
    const d = await r.json().catch(() => null);
    if (d?.ok) { success('Post deleted'); load(); } else err('Delete failed');
  }

  function setField<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function autoSlug() {
    if (form.title && !form.slug) {
      setField('slug', form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    }
  }

  const seoTitleLen = form.title.length;
  const seoExcerptLen = form.excerpt.length;

  // Full-page editor
  if (editorOpen) {
    return (
      <div className="min-h-screen bg-[#F7F7FB]">
        {/* Editor header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border-light px-4 lg:px-6 h-14 flex items-center gap-3">
          <button onClick={() => setEditorOpen(false)} className="p-2 rounded-lg hover:bg-surface text-text-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-text truncate">
              {editId ? 'Edit Post' : 'New Post'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-[12px] text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setField('published', e.target.checked)}
                className="accent-primary rounded"
              />
              Publish
            </label>
            <Button onClick={save} loading={saving} disabled={!form.title || !form.slug || !form.content} size="sm">
              <Save className="h-3.5 w-3.5 mr-1" /> {editId ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>

        {/* Editor body */}
        <div className="max-w-[1200px] mx-auto p-4 lg:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Main content area */}
            <div className="space-y-5">
              {/* Title */}
              <div>
                <input
                  value={form.title}
                  onChange={(e) => setField('title', e.target.value)}
                  onBlur={autoSlug}
                  placeholder="Post title..."
                  className="w-full text-2xl font-bold text-text bg-transparent border-0 outline-none placeholder:text-text-subtle"
                />
              </div>

              {/* Slug */}
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-text-muted shrink-0">/blog/</span>
                <input
                  value={form.slug}
                  onChange={(e) => setField('slug', e.target.value)}
                  placeholder="post-slug"
                  className="flex-1 font-mono text-text-muted bg-transparent border-0 outline-none placeholder:text-text-subtle"
                />
              </div>

              {/* Excerpt */}
              <div className="bg-white border border-border-light rounded-xl p-4">
                <label className={labelCls}>Excerpt</label>
                <input
                  value={form.excerpt}
                  onChange={(e) => setField('excerpt', e.target.value)}
                  placeholder="Brief description for search results and social sharing..."
                  className="w-full text-[13px] text-text bg-transparent border-0 outline-none placeholder:text-text-subtle"
                />
                <div className="mt-1 text-[10px] text-text-subtle">
                  {seoExcerptLen}/160 characters
                  {seoExcerptLen > 160 && <span className="text-amber-600 ml-1">Too long for meta description</span>}
                </div>
              </div>

              {/* Content editor */}
              <div className="bg-white border border-border-light rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border-light flex items-center gap-2">
                  <Type className="w-3.5 h-3.5 text-text-subtle" />
                  <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">Content (Markdown)</span>
                  <span className="ml-auto text-[10px] text-text-subtle">
                    {form.content.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>
                <textarea
                  value={form.content}
                  onChange={(e) => setField('content', e.target.value)}
                  placeholder="Write your post content in Markdown..."
                  rows={24}
                  className="w-full px-4 py-3 text-[13px] text-text font-mono leading-relaxed resize-y border-0 outline-none placeholder:text-text-subtle min-h-[400px]"
                />
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              {/* Publishing */}
              <div className="bg-white border border-border-light rounded-xl p-4">
                <h3 className="text-[12px] font-semibold text-text flex items-center gap-2 mb-3">
                  <Calendar className="w-3.5 h-3.5 text-text-subtle" /> Publishing
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-text-muted">Status</span>
                    <StatusBadge status={form.published ? 'PUBLISHED' : 'DRAFT'} dot />
                  </div>
                  <div>
                    <label className={labelCls}>Author</label>
                    <input value={form.author} onChange={(e) => setField('author', e.target.value)} className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <input value={form.category} onChange={(e) => setField('category', e.target.value)} className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Reading Time (min)</label>
                    <input value={form.readingTimeMinutes} onChange={(e) => setField('readingTimeMinutes', e.target.value)} inputMode="numeric" placeholder="5" className={fieldCls} />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="bg-white border border-border-light rounded-xl p-4">
                <h3 className="text-[12px] font-semibold text-text flex items-center gap-2 mb-3">
                  <Tag className="w-3.5 h-3.5 text-text-subtle" /> Tags
                </h3>
                <div>
                  <label className={labelCls}>Tags (JSON array)</label>
                  <input value={form.tagsJson} onChange={(e) => setField('tagsJson', e.target.value)} placeholder='["tag1", "tag2"]' className={`${fieldCls} font-mono text-[12px]`} />
                </div>
              </div>

              {/* Media */}
              <div className="bg-white border border-border-light rounded-xl p-4">
                <h3 className="text-[12px] font-semibold text-text flex items-center gap-2 mb-3">
                  <Image className="w-3.5 h-3.5 text-text-subtle" /> Media
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Cover Image URL</label>
                    <input value={form.coverImage} onChange={(e) => setField('coverImage', e.target.value)} placeholder="/images/blog/cover.webp" className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Cover Alt Text</label>
                    <input value={form.coverAlt} onChange={(e) => setField('coverAlt', e.target.value)} placeholder="Descriptive alt text" className={fieldCls} />
                    {form.coverImage && !form.coverAlt && (
                      <p className="mt-1 text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Missing alt text
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SEO */}
              <div className="bg-white border border-border-light rounded-xl p-4">
                <h3 className="text-[12px] font-semibold text-text flex items-center gap-2 mb-3">
                  <Search className="w-3.5 h-3.5 text-text-subtle" /> SEO
                </h3>
                <div className="space-y-3">
                  {/* SEO Preview */}
                  <div className="bg-surface rounded-lg p-3">
                    <p className="text-[10px] font-semibold text-text-subtle uppercase tracking-wider mb-2">Search Preview</p>
                    <p className="text-blue-700 text-[13px] font-medium truncate">{form.title || 'Post Title'}</p>
                    <p className="text-emerald-700 text-[11px] truncate">savdown.com/blog/{form.slug || 'post-slug'}</p>
                    <p className="text-[11px] text-text-muted line-clamp-2 mt-0.5">{form.excerpt || 'Post excerpt will appear here...'}</p>
                  </div>

                  <div>
                    <label className={labelCls}>Focus Keyword</label>
                    <input value={form.primaryKeyword} onChange={(e) => setField('primaryKeyword', e.target.value)} className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Secondary Keywords (JSON)</label>
                    <input value={form.secondaryKeywordsJson} onChange={(e) => setField('secondaryKeywordsJson', e.target.value)} className={`${fieldCls} font-mono text-[12px]`} />
                  </div>
                  <div>
                    <label className={labelCls}>OG Image URL</label>
                    <input value={form.ogImage} onChange={(e) => setField('ogImage', e.target.value)} placeholder="/images/blog/og.webp" className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Canonical URL</label>
                    <input value={form.canonicalUrl} onChange={(e) => setField('canonicalUrl', e.target.value)} placeholder="/blog/post-slug" className={fieldCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tool Slug (CTA)</label>
                    <input value={form.toolSlug} onChange={(e) => setField('toolSlug', e.target.value)} placeholder="youtube-video-downloader" className={`${fieldCls} font-mono text-[12px]`} />
                  </div>

                  {/* SEO Warnings */}
                  <div className="space-y-1.5">
                    {seoTitleLen > 60 && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Title exceeds 60 characters ({seoTitleLen})
                      </p>
                    )}
                    {seoExcerptLen > 160 && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Meta description exceeds 160 characters
                      </p>
                    )}
                    {!form.primaryKeyword && form.content && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> No focus keyword set
                      </p>
                    )}
                    {!form.coverImage && (
                      <p className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> No featured image
                      </p>
                    )}
                    {seoTitleLen > 0 && seoTitleLen <= 60 && seoExcerptLen <= 160 && form.primaryKeyword && form.coverImage && (
                      <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> SEO looks good
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Post listing
  return (
    <AdminPage>
      <PageHeader
        title="Content"
        description={`${total} posts`}
        actions={<ActionButton variant="primary" icon={Plus} onClick={openCreate}>New Post</ActionButton>}
      />

      <FilterBar search={search} onSearch={setSearch} placeholder="Search posts...">
        {STATUS_FILTERS.map((s) => (
          <FilterTab
            key={s}
            label={s === 'ALL' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            active={filter === s}
            onClick={() => setFilter(s)}
          />
        ))}
      </FilterBar>

      {error ? (
        <ErrorState message="Failed to load posts." onRetry={load} />
      ) : (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <Th>Title</Th>
                <Th>Category</Th>
                <Th>Author</Th>
                <Th>Status</Th>
                <Th>Published</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : posts.length === 0 ? (
                <tr><td colSpan={6}>
                  <EmptyState
                    icon={FileText}
                    title="No posts yet"
                    message="Create your first blog post to get started."
                    action={<ActionButton variant="primary" icon={Plus} onClick={openCreate}>New Post</ActionButton>}
                  />
                </td></tr>
              ) : posts.map((post) => (
                <tr key={post.id} className="hover:bg-surface/40 transition-colors">
                  <Td>
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">{post.title}</p>
                      <p className="text-[11px] text-text-muted truncate">/blog/{post.slug}</p>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-[12px] text-text-muted bg-surface px-2 py-0.5 rounded-md">{post.category || 'Guides'}</span>
                  </Td>
                  <Td className="text-[12px] text-text-muted">{post.author}</Td>
                  <Td><StatusBadge status={post.published ? 'PUBLISHED' : 'DRAFT'} dot /></Td>
                  <Td className="text-[12px] text-text-muted whitespace-nowrap tabular-nums">
                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '—'}
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(post)} className="p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-primary transition-colors" title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => togglePublish(post)} className="p-1.5 rounded-lg text-text-muted hover:bg-surface hover:text-emerald-600 transition-colors" title={post.published ? 'Unpublish' : 'Publish'}>
                        {post.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => handleDelete(post)} className="p-1.5 rounded-lg text-text-muted hover:bg-rose-50 hover:text-rose-600 transition-colors" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
        </TableCard>
      )}
    </AdminPage>
  );
}
