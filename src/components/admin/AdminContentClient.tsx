'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterBar, FilterTab, EmptyState,
} from './AdminUI';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { Pencil, Trash2, Eye, EyeOff, Plus } from 'lucide-react';

const STATUS_FILTERS = ['ALL', 'published', 'draft'];

type Post = {
  id: string; slug: string; title: string; author: string;
  published: boolean; publishedAt: string | null; tagsJson: string;
  createdAt: string; updatedAt: string;
};

type PostForm = { title: string; slug: string; excerpt: string; content: string; author: string; tagsJson: string; published: boolean };
const EMPTY_FORM: PostForm = { title: '', slug: '', excerpt: '', content: '', author: 'Editorial Team', tagsJson: '[]', published: false };

export function AdminContentClient() {
  const [posts, setPosts]     = useState<Post[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'create' | 'edit' | null>(null);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState<PostForm>(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const { success, error: err } = useToast();
  const { confirm }           = useConfirm();

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search)               p.set('search', search);
    if (filter !== 'ALL')     p.set('status', filter);
    fetch(`/api/admin/content?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setPosts(d.data.posts); setTotal(d.data.total); setTotalPages(d.data.totalPages); } })
      .finally(() => setLoading(false));
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filter]);

  function openCreate() { setForm(EMPTY_FORM); setEditId(null); setModal('create'); }
  function openEdit(p: Post) {
    setForm({ title: p.title, slug: p.slug, excerpt: '', content: '', author: p.author, tagsJson: p.tagsJson, published: p.published });
    setEditId(p.id); setModal('edit');
  }

  async function save() {
    setSaving(true);
    try {
      const url    = editId ? `/api/admin/content/${editId}` : '/api/admin/content';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const d = await res.json().catch(() => null);
      if (!d?.ok) { err('Save failed', d?.error); return; }
      success(editId ? 'Post updated' : 'Post created');
      setModal(null); load();
    } finally { setSaving(false); }
  }

  async function togglePublish(post: Post) {
    const res = await fetch(`/api/admin/content/${post.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ published: !post.published }),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) { success(post.published ? 'Unpublished' : 'Published'); load(); } else err('Failed');
  }

  async function handleDelete(post: Post) {
    const ok = await confirm({ title: `Delete "${post.title}"?`, description: 'This cannot be undone.', confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;
    const res = await fetch(`/api/admin/content/${post.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => null);
    if (d?.ok) { success('Post deleted'); load(); } else err('Delete failed');
  }

  function field(key: keyof PostForm) {
    return { value: form[key] as string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value }) };
  }

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin"
        title="Content"
        description={`${total} posts`}
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="w-3.5 h-3.5" /> New Post
          </Button>
        }
      />

      <FilterBar search={search} onSearch={setSearch} placeholder="Search posts…">
        {STATUS_FILTERS.map((f) => <FilterTab key={f} label={f === 'ALL' ? 'All' : f} active={filter === f} onClick={() => setFilter(f)} />)}
      </FilterBar>

      <TableCard>
        <Table>
          <thead>
            <tr><Th>Title</Th><Th>Author</Th><Th>Status</Th><Th>Published</Th><Th>Created</Th><Th>Actions</Th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={6}><div className="h-10 mx-4 my-1 rounded-lg bg-surface animate-pulse" /></td></tr>)
            ) : posts.length === 0 ? (
              <tr><td colSpan={6}><EmptyState message="No posts yet." /></td></tr>
            ) : posts.map((p) => (
              <tr key={p.id} className="hover:bg-surface/40">
                <Td>
                  <p className="font-medium text-text">{p.title}</p>
                  <p className="text-xs text-text-muted">{p.slug}</p>
                </Td>
                <Td className="text-text-muted">{p.author}</Td>
                <Td><StatusBadge status={p.published ? 'APPROVED' : 'PENDING'} /></Td>
                <Td className="text-xs text-text-muted">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : '—'}</Td>
                <Td className="text-xs text-text-muted">{new Date(p.createdAt).toLocaleDateString()}</Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-primary transition-colors" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => togglePublish(p)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-accent transition-colors" title={p.published ? 'Unpublish' : 'Publish'}>
                      {p.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg hover:bg-rose-50 text-text-muted hover:text-rose-600 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'New Post' : 'Edit Post'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Title *</label>
              <input {...field('title')} className="w-full h-9 rounded-xl border border-border px-3 text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Slug *</label>
              <input {...field('slug')} className="w-full h-9 rounded-xl border border-border px-3 text-sm focus:outline-none focus:border-primary/50 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Excerpt</label>
            <input {...field('excerpt')} className="w-full h-9 rounded-xl border border-border px-3 text-sm focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1">Content *</label>
            <textarea {...field('content')} rows={8}
              className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Author</label>
              <input {...field('author')} className="w-full h-9 rounded-xl border border-border px-3 text-sm focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Tags (JSON array)</label>
              <input {...field('tagsJson')} className="w-full h-9 rounded-xl border border-border px-3 text-sm focus:outline-none focus:border-primary/50 font-mono" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-primary" />
            Publish immediately
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 rounded-xl text-sm text-text-muted hover:bg-surface transition-colors">Cancel</button>
            <Button onClick={save} loading={saving} disabled={!form.title || !form.slug || !form.content} size="sm">
              {modal === 'create' ? 'Create Post' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminPage>
  );
}
