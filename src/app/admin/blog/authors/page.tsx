'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, ExternalLink } from 'lucide-react';

type BlogAuthor = {
  id: string;
  name: string;
  slug: string;
  role: string;
  shortBio: string | null;
  profileImage: string | null;
  createdAt: string;
  _count: { posts: number };
};

export default function AdminBlogAuthorsPage() {
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', role: 'Author', shortBio: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/authors')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setAuthors(d.data); else setError(d.error); })
      .catch(() => setError('Failed to load authors'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/authors', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          expertiseJson: '[]',
          socialsJson: '{}',
        }),
      });
      const data = await res.json();
      if (!data.ok) { setError(data.error); return; }
      setAuthors((prev) => [data.data, ...prev]);
      setForm({ name: '', slug: '', role: 'Author', shortBio: '' });
      setCreating(false);
    } catch {
      setError('Failed to create author');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this author? Posts will be unlinked but not deleted.')) return;
    try {
      const res = await fetch(`/api/admin/authors/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) setAuthors((prev) => prev.filter((a) => a.id !== id));
      else setError(data.error);
    } catch {
      setError('Failed to delete author');
    }
  };

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  return (
    <div className="admin-panel p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">Blog Authors</h1>
          <p className="text-sm text-text-muted mt-1">Manage editorial author profiles displayed on articles and author pages.</p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" /> New Author
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create form */}
      {creating && (
        <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-border bg-white p-5 shadow-soft space-y-4">
          <h2 className="text-base font-semibold text-text">New Author</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="author-name">Name</label>
              <input
                id="author-name"
                type="text"
                required
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'rgb(var(--primary) / 0.3)' } as React.CSSProperties}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value, slug: autoSlug(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="author-slug">Slug</label>
              <input
                id="author-slug"
                type="text"
                required
                pattern="[a-z0-9-]+"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 font-mono"
                style={{ '--tw-ring-color': 'rgb(var(--primary) / 0.3)' } as React.CSSProperties}
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="author-role">Role</label>
              <input
                id="author-role"
                type="text"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'rgb(var(--primary) / 0.3)' } as React.CSSProperties}
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1" htmlFor="author-bio">Short bio</label>
              <input
                id="author-bio"
                type="text"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-text focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': 'rgb(var(--primary) / 0.3)' } as React.CSSProperties}
                value={form.shortBio}
                onChange={(e) => setForm((p) => ({ ...p, shortBio: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Author'}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-muted hover:text-text"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Authors table */}
      {loading ? (
        <div className="text-sm text-text-muted py-8 text-center">Loading…</div>
      ) : authors.length === 0 ? (
        <div className="text-sm text-text-muted py-8 text-center rounded-2xl border border-border bg-white">
          No authors yet. Create one above.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white shadow-soft overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider">Author</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden sm:table-cell">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider hidden md:table-cell">Articles</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {authors.map((author) => (
                <tr key={author.id} className="hover:bg-surface/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text">{author.name}</div>
                    <div className="text-xs text-text-muted font-mono mt-0.5">{author.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-text-muted hidden sm:table-cell">{author.role}</td>
                  <td className="px-4 py-3 text-text-muted hidden md:table-cell">{author._count.posts}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/blog/author/${author.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary-light transition-colors"
                        aria-label={`View ${author.name}'s public profile`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(author.id)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label={`Delete ${author.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
