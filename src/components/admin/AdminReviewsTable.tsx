'use client';

import { useEffect, useState, useCallback } from 'react';
import { Star, Check, X as XIcon, Pencil, Trash2, BadgeCheck, MessageSquare } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';
import {
  FilterBar, FilterTab, EmptyState, ErrorState, StatusBadge, Pagination, Skeleton,
} from './AdminUI';

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

export function AdminReviewsTable() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>('PENDING');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
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
    setError(false);
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
        } else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, search]);

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
      description: `Review by ${r.name} will be permanently removed.`,
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
      <FilterBar search={search} onSearch={setSearch} placeholder="Search reviews...">
        {STATUS_TABS.map((s) => (
          <FilterTab
            key={s}
            label={s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            active={status === s}
            onClick={() => setStatus(s)}
          />
        ))}
      </FilterBar>

      {error ? (
        <ErrorState message="Failed to load reviews." onRetry={load} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-border-light rounded-xl p-5">
              <div className="flex gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="w-28 space-y-2">
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews found"
          message={status !== 'ALL' ? `No ${status.toLowerCase()} reviews. Try a different filter.` : 'Customer reviews will appear here when submitted.'}
        />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-border-light rounded-xl p-5 hover:shadow-soft transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary/[0.08] flex items-center justify-center text-[12px] font-bold text-primary shrink-0 hidden md:flex">
                  {r.name[0]?.toUpperCase() ?? '?'}
                </div>

                <div className="min-w-0 flex-1">
                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-text">{r.name}</span>
                    <StatusBadge status={r.status} dot />
                    {r.featured && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">Featured</span>
                    )}
                    {r.verified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md">
                        <BadgeCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 text-amber-400 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-current' : 'fill-none text-text-subtle'}`} />
                    ))}
                    <span className="ml-1.5 text-[11px] text-text-muted">{r.rating}/5</span>
                  </div>

                  {/* Review text */}
                  <p className="text-[13px] text-text leading-relaxed mb-2">{r.review}</p>

                  {/* Footer meta */}
                  <p className="text-[11px] text-text-muted">
                    {r.email && <>{r.email} · </>}
                    {(r.role || r.company) && <>{[r.role, r.company].filter(Boolean).join(' at ')} · </>}
                    {r.platform} · {new Date(r.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {!r.userId && ' · Imported'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap md:flex-col gap-1.5 md:w-28 shrink-0">
                  {r.status !== 'APPROVED' && (
                    <button
                      onClick={() => runAction(r.id, 'approve')}
                      disabled={pendingAction === r.id + 'approve'}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" /> Approve
                    </button>
                  )}
                  {r.status !== 'REJECTED' && (
                    <button
                      onClick={() => runAction(r.id, 'reject')}
                      disabled={pendingAction === r.id + 'reject'}
                      className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      <XIcon className="w-3 h-3" /> Reject
                    </button>
                  )}
                  <button
                    onClick={() => runAction(r.id, r.featured ? 'unfeature' : 'feature')}
                    disabled={pendingAction === r.id + (r.featured ? 'unfeature' : 'feature')}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    {r.featured ? 'Unfeature' : 'Feature'}
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-text-muted bg-surface hover:bg-surface/70 hover:text-text transition-colors"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-text-muted hover:text-rose-600 bg-surface hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Review"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-text-muted hover:text-text hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <Button onClick={saveEdit} loading={saving} disabled={editText.trim().length < 10 || editRating < 1}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Rating</label>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} type="button" onClick={() => setEditRating(i + 1)} className="transition-transform hover:scale-110">
                  <Star className={`w-5 h-5 ${i < editRating ? 'fill-amber-400 text-amber-400' : 'fill-none text-text-subtle'}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Review Text</label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-border-light bg-white px-3 py-2.5 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Role</label>
              <input
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                placeholder="e.g. Designer"
                className="w-full h-9 rounded-lg border border-border-light bg-white px-3 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Company</label>
              <input
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full h-9 rounded-lg border border-border-light bg-white px-3 text-[13px] text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
