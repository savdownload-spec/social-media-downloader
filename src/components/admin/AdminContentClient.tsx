'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminPage, PageHeader, TableCard, Table, Th, Td, StatusBadge, Pagination, FilterBar, FilterTab, EmptyState } from './AdminUI';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Pencil, Trash2, Eye, EyeOff, Plus } from 'lucide-react';

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  author: string;
  tagsJson: string;
  category: string;
  coverImage: string | null;
  coverAlt: string | null;
  ogImage: string | null;
  primaryKeyword: string | null;
  secondaryKeywordsJson: string;
  canonicalUrl: string | null;
  toolSlug: string | null;
  readingTimeMinutes: number | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PostForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  tagsJson: string;
  category: string;
  coverImage: string;
  coverAlt: string;
  ogImage: string;
  primaryKeyword: string;
  secondaryKeywordsJson: string;
  canonicalUrl: string;
  toolSlug: string;
  readingTimeMinutes: string;
  published: boolean;
};

const EMPTY_FORM: PostForm = {
  title: '', slug: '', excerpt: '', content: '', author: 'Editorial Team', tagsJson: '[]', category: 'Guides',
  coverImage: '', coverAlt: '', ogImage: '', primaryKeyword: '', secondaryKeywordsJson: '[]', canonicalUrl: '',
  toolSlug: '', readingTimeMinutes: '', published: false,
};
const STATUS_FILTERS = ['ALL', 'published', 'draft'];

export function AdminContentClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { success, error: err } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    if (filter !== 'ALL') params.set('status', filter);
    fetch(`/api/admin/content?${params}`)
      .then((response) => response.json())
      .then((data) => { if (data.ok) { setPosts(data.data.posts); setTotal(data.data.total); setTotalPages(data.data.totalPages); } })
      .finally(() => setLoading(false));
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filter]);

  function openCreate() { setForm(EMPTY_FORM); setEditId(null); setModal('create'); }
  function openEdit(post: Post) {
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      author: post.author,
      tagsJson: post.tagsJson,
      category: post.category || 'Guides',
      coverImage: post.coverImage ?? '',
      coverAlt: post.coverAlt ?? '',
      ogImage: post.ogImage ?? '',
      primaryKeyword: post.primaryKeyword ?? '',
      secondaryKeywordsJson: post.secondaryKeywordsJson || '[]',
      canonicalUrl: post.canonicalUrl ?? '',
      toolSlug: post.toolSlug ?? '',
      readingTimeMinutes: post.readingTimeMinutes ? String(post.readingTimeMinutes) : '',
      published: post.published,
    });
    setEditId(post.id); setModal('edit');
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
      setModal(null); load();
    } finally { setSaving(false); }
  }

  async function togglePublish(post: Post) {
    const response = await fetch(`/api/admin/content/${post.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ published: !post.published }) });
    const data = await response.json().catch(() => null);
    if (data?.ok) { success(post.published ? 'Unpublished' : 'Published'); load(); } else err('Failed');
  }

  async function handleDelete(post: Post) {
    const ok = await confirm({ title: `Delete "${post.title}"?`, description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    const response = await fetch(`/api/admin/content/${post.id}`, { method: 'DELETE' });
    const data = await response.json().catch(() => null);
    if (data?.ok) { success('Post deleted'); load(); } else err('Delete failed');
  }

  function field(key: keyof PostForm) {
    return {
      value: form[key] as string,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value }),
    };
  }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin" title="Content" description={`${total} posts`} actions={<Button onClick={openCreate} size="sm"><Plus className="h-3.5 w-3.5" /> New Post</Button>} />
      <FilterBar search={search} onSearch={setSearch} placeholder="Search posts…">
        {STATUS_FILTERS.map((status) => <FilterTab key={status} label={status === 'ALL' ? 'All' : status} active={filter === status} onClick={() => setFilter(status)} />)}
      </FilterBar>

      <TableCard>
        <Table>
          <thead><tr><Th>Title</Th><Th>Category</Th><Th>Author</Th><Th>Status</Th><Th>Published</Th><Th>Actions</Th></tr></thead>
          <tbody>
            {loading ? Array.from({ length: 6 }).map((_, index) => <tr key={index}><td colSpan={6}><div className="mx-4 my-1 h-10 animate-pulse rounded-lg bg-surface" /></td></tr>) : posts.length === 0 ? <tr><td colSpan={6}><EmptyState message="No posts yet." /></td></tr> : posts.map((post) => (
              <tr key={post.id} className="hover:bg-surface/40">
                <Td><p className="font-medium text-text">{post.title}</p><p className="text-xs text-text-muted">{post.slug}</p></Td>
                <Td className="text-text-muted">{post.category || 'Guides'}</Td>
                <Td className="text-text-muted">{post.author}</Td>
                <Td><StatusBadge status={post.published ? 'APPROVED' : 'PENDING'} /></Td>
                <Td className="text-xs text-text-muted">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : '—'}</Td>
                <Td><div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(post)} className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-primary" title="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => togglePublish(post)} className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-accent" title={post.published ? 'Unpublish' : 'Publish'}>{post.published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                  <button onClick={() => handleDelete(post)} className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-rose-50 hover:text-rose-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div></Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'New Post' : 'Edit Post'} size="lg">
        <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Title *</label><input {...field('title')} className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:border-primary/50 focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Slug *</label><input {...field('slug')} className="h-9 w-full rounded-xl border border-border px-3 font-mono text-sm focus:border-primary/50 focus:outline-none" /></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-text-muted">Excerpt</label><input {...field('excerpt')} className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:border-primary/50 focus:outline-none" /></div>
          <div><label className="mb-1 block text-xs font-semibold text-text-muted">Content * (Markdown)</label><textarea {...field('content')} rows={10} className="w-full resize-none rounded-xl border border-border px-3 py-2 font-mono text-sm focus:border-primary/50 focus:outline-none" /></div>

          <div className="border-t border-border pt-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Editorial metadata</p></div>
          <div className="grid gap-3 md:grid-cols-3">
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Author</label><input {...field('author')} className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:border-primary/50 focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Category</label><input {...field('category')} className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:border-primary/50 focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Reading time (minutes)</label><input {...field('readingTimeMinutes')} inputMode="numeric" className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:border-primary/50 focus:outline-none" /></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Tags (JSON array)</label><input {...field('tagsJson')} className="h-9 w-full rounded-xl border border-border px-3 font-mono text-sm focus:border-primary/50 focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Related keywords (JSON array)</label><input {...field('secondaryKeywordsJson')} className="h-9 w-full rounded-xl border border-border px-3 font-mono text-sm focus:border-primary/50 focus:outline-none" /></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Primary keyword</label><input {...field('primaryKeyword')} className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:border-primary/50 focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Tool slug for CTA</label><input {...field('toolSlug')} placeholder="youtube-video-downloader" className="h-9 w-full rounded-xl border border-border px-3 font-mono text-sm focus:border-primary/50 focus:outline-none" /></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Cover image path or URL</label><input {...field('coverImage')} placeholder="/images/blog/cover.webp" className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:border-primary/50 focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Cover alt text</label><input {...field('coverAlt')} className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:border-primary/50 focus:outline-none" /></div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">OG image path or URL</label><input {...field('ogImage')} placeholder="/images/blog/cover.webp" className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:border-primary/50 focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-text-muted">Canonical URL (optional)</label><input {...field('canonicalUrl')} placeholder="/blog/my-article" className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:border-primary/50 focus:outline-none" /></div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} className="accent-primary" /> Publish immediately</label>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button onClick={() => setModal(null)} className="rounded-xl px-4 py-2 text-sm text-text-muted transition-colors hover:bg-surface">Cancel</button>
            <Button onClick={save} loading={saving} disabled={!form.title || !form.slug || !form.content} size="sm">{modal === 'create' ? 'Create Post' : 'Save Changes'}</Button>
          </div>
        </div>
      </Modal>
    </AdminPage>
  );
}
