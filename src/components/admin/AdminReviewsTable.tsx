'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star, Check, X as XIcon, Pencil, Trash2, BadgeCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';

type AdminReview = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  company: string | null;
  platform: string;
  rating: number;
  review: string;
  status: string;
  featured: boolean;
  verified: boolean;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  userId: string | null;
};

const STATUS_TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const;

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-rose-50 text-rose-700',
};

export function AdminReviewsTable() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminReview | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editText, setEditText] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const { confirm } = useConfirm();
  const { success, error: errorToast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status !== 'ALL') params.set('status', status);
    if (search.trim()) params.set('search', search.trim());

    fetch(`/api/admin/reviews?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) {
          setReviews(data.data.reviews || []);
          setTotal(data.data.total || 0);
          setTotalPages(data.data.totalPages || 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  async function runAction(id: string, action: 'approve' | 'reject' | 'feature' | 'unfeature') {
    setPendingAction(id + action);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        errorToast('Action failed', data?.error || 'Please try again.');
        return;
      }
      success(data.data.message);
      load();
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDelete(r: AdminReview) {
    const confirmed = await confirm({
      title: 'Delete this review?',
      description: `By ${r.name}. This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/reviews/${r.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        errorToast('Delete failed', data?.error || 'Please try again.');
        return;
      }
      success('Review deleted');
      load();
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    }
  }

  function openEdit(r: AdminReview) {
    setEditing(r);
    setEditRating(r.rating);
    setEditText(r.review);
    setEditRole(r.role ?? '');
    setEditCompany(r.company ?? '');
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/reviews/${editing.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          rating: editRating,
          review: editText,
          role: editRole || null,
          company: editCompany || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        errorToast('Update failed', data?.error || 'Please try again.');
        return;
      }
      success('Review updated');
      setEditing(null);
      load();
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                status === s
                  ? 'bg-text text-white shadow-soft-md'
                  : 'bg-surface text-text-muted hover:text-text hover:bg-surface/60'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search review text, name, or email…"
          className="w-full sm:w-72 sm:ml-auto h-10 rounded-xl border border-border bg-white px-4 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center text-text-muted">No reviews match this filter.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-2xl bg-white border border-border shadow-soft p-5">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? STATUS_STYLES.PENDING}`}>
                      {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                    </span>
                    {r.featured && (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">⭐ Featured</span>
                    )}
                    {r.verified && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                        <BadgeCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                    <span className="text-xs text-text-subtle">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {!r.userId && <span className="text-xs text-text-subtle">· no account (imported)</span>}
                  </div>

                  <div className="flex items-center gap-0.5 text-amber-400 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-current' : 'fill-none text-text-subtle'}`} />
                    ))}
                  </div>

                  <p className="text-sm text-text leading-relaxed mb-2">{r.review}</p>

                  <p className="text-xs text-text-muted">
                    <span className="font-semibold text-text">{r.name}</span>
                    {r.email && <> · {r.email}</>}
                    {(r.role || r.company) && <> · {[r.role, r.company].filter(Boolean).join(' at ')}</>}
                    {' · '}
                    {r.platform}
                  </p>
                </div>

                <div className="flex flex-wrap md:flex-col gap-2 md:w-36 shrink-0">
                  {r.status !== 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => runAction(r.id, 'approve')}
                      disabled={pendingAction === r.id + 'approve'}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  {r.status !== 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() => runAction(r.id, 'reject')}
                      disabled={pendingAction === r.id + 'reject'}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      <XIcon className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => runAction(r.id, r.featured ? 'unfeature' : 'feature')}
                    disabled={pendingAction === r.id + (r.featured ? 'unfeature' : 'feature')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    ⭐ {r.featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted bg-surface hover:bg-surface/70 hover:text-text transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-rose-600 bg-surface hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted bg-surface hover:bg-surface/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {totalPages} · {total} total
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted bg-surface hover:bg-surface/70 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Review"
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:text-text hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <Button onClick={saveEdit} loading={saving} disabled={editText.trim().length < 10 || editRating < 1}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Rating</label>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} type="button" onClick={() => setEditRating(i + 1)} className="transition-transform hover:scale-110">
                  <Star className={`w-6 h-6 ${i < editRating ? 'fill-amber-400 text-amber-400' : 'fill-none text-text-subtle'}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Review</label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-text focus:outline-none focus:border-primary/40 transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Role</label>
              <input
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm text-text focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">Company</label>
              <input
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm text-text focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
