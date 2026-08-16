'use client';

import { useState } from 'react';
import { Star, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';

export type MyReview = {
  id: string;
  rating: number;
  review: string;
  role: string | null;
  company: string | null;
  platform: string;
  status: string;
  featured: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  approvedAt: string | Date | null;
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-warning',
  APPROVED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  REJECTED: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export function MyReviews({ reviews: initialReviews }: { reviews: MyReview[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [editing, setEditing] = useState<MyReview | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editText, setEditText] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const { confirm } = useConfirm();
  const { success, error: errorToast } = useToast();

  function openEdit(r: MyReview) {
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
      const res = await fetch(`/api/reviews/${editing.id}`, {
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

      const wasApproved = editing.status === 'APPROVED';
      setReviews((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...data.data } : r)));
      success('Review updated', wasApproved ? 'Sent back for moderation.' : undefined);
      setEditing(null);
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(r: MyReview) {
    const confirmed = await confirm({
      title: 'Delete this review?',
      description: 'This cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/reviews/${r.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        errorToast('Delete failed', data?.error || 'Please try again.');
        return;
      }

      setReviews((prev) => prev.filter((x) => x.id !== r.id));
      success('Review deleted');
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    }
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-card border border-border shadow-soft p-6">
      <h2 className="text-lg font-bold text-text mb-1">My Reviews</h2>
      <p className="text-sm text-text-muted mb-6">Reviews you&apos;ve submitted.</p>

      {reviews.length === 0 ? (
        <p className="text-sm text-text-muted py-8 text-center">You haven&apos;t submitted a review yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-border-light p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] ?? STATUS_STYLES.PENDING}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    {r.featured && (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/15 dark:text-warning px-2 py-0.5 rounded-full">
                        ⭐ Featured
                      </span>
                    )}
                    <span className="text-xs text-text-subtle">
                      {new Date(r.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 text-amber-400 mb-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-current' : 'fill-none text-text-subtle'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-text leading-relaxed line-clamp-2">{r.review}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    aria-label="Edit review"
                    className="w-8 h-8 rounded-lg hover:bg-surface flex items-center justify-center text-text-muted hover:text-text transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(r)}
                    aria-label="Delete review"
                    className="w-8 h-8 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/15 flex items-center justify-center text-text-muted hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Review"
        description={
          editing?.status === 'APPROVED'
            ? 'Editing an approved review sends it back for moderation.'
            : undefined
        }
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
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
              Rating
            </label>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setEditRating(i + 1)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      i < editRating ? 'fill-amber-400 text-amber-400' : 'fill-none text-text-subtle'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
              Review
            </label>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-border bg-white dark:bg-card px-4 py-3 text-sm text-text focus:outline-none focus:border-primary/40 transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                Role
              </label>
              <input
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-white dark:bg-card px-3 text-sm text-text focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                Company
              </label>
              <input
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-white dark:bg-card px-3 text-sm text-text focus:outline-none focus:border-primary/40 transition-colors"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
