'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { AlertTriangle, Check, Edit3, Flag, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';

type Comment = {
  id: string;
  body: string;
  status: 'PENDING' | 'APPROVED' | 'HIDDEN' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  user: { name: string; image: string | null };
  isOwner: boolean;
};

type BlogCommentsProps = { postSlug: string };

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'SD';
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export function BlogComments({ postSlug }: BlogCommentsProps) {
  const { data: session, status: authStatus } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const loadComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/blog/comments?slug=${encodeURIComponent(postSlug)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (response.ok && payload?.ok) setComments(payload.data.comments ?? []);
      else setMessage(payload?.error ?? 'Comments could not be loaded.');
    } catch {
      setMessage('Comments could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadComments(); }, [postSlug]);

  const submit = async () => {
    const value = body.trim();
    if (value.length < 2 || value.length > 2000) return;
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/blog/comments', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: postSlug, body: value }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? 'Unable to submit your comment.');
      setBody('');
      setMessage('Thanks — your comment was submitted for review.');
      await loadComments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit your comment.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateComment = async (id: string, action: 'edit' | 'report', value?: string) => {
    try {
      const response = await fetch(`/api/blog/comments/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, body: value }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? 'Unable to update comment.');
      setMessage(action === 'report' ? 'Thank you. The comment has been flagged for review.' : 'Your edit was submitted for review.');
      setEditing(null);
      await loadComments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update comment.');
    }
  };

  const removeComment = async (id: string) => {
    if (!window.confirm('Delete this comment? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/blog/comments/${id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? 'Unable to delete comment.');
      setComments((items) => items.filter((comment) => comment.id !== id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete comment.');
    }
  };

  const report = (id: string) => {
    const reason = window.prompt('Briefly tell us why this comment should be reviewed.');
    if (reason === null) return;
    void updateComment(id, 'report', reason.trim() || 'Reader report');
  };

  return (
    <section id="comments" className="mt-12 border-t border-border pt-10" aria-labelledby="comments-heading">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">The community</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h2 id="comments-heading" className="font-display text-2xl font-semibold tracking-tight text-text md:text-3xl">
          Join the conversation
          <span className="ml-2 align-middle text-base font-semibold text-primary/70">({comments.length})</span>
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
        Have a question or a tip to share? Helpful, respectful discussion keeps each guide better for everyone.
      </p>

      {authStatus === 'authenticated' && session?.user ? (
        <form
          className="mt-7 rounded-2xl border border-border bg-surface/60 p-5"
          onSubmit={(event) => { event.preventDefault(); void submit(); }}
        >
          <label htmlFor="blog-comment" className="text-sm font-semibold text-text">Add your perspective</label>
          <textarea
            id="blog-comment"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Share a useful tip, question, or clarification…"
            className="mt-3 w-full resize-y rounded-xl border border-border bg-white px-4 py-3 text-sm leading-6 text-text outline-none transition-shadow placeholder:text-text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10 dark:bg-card"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-subtle">{body.length}/2000 · Comments are reviewed before publication.</p>
            <button
              type="submit"
              disabled={submitting || body.trim().length < 2}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              Post comment
            </button>
          </div>
        </form>
      ) : authStatus !== 'loading' ? (
        <div className="mt-7 flex flex-col gap-4 rounded-2xl border border-border bg-surface/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold text-text">Sign in to join the conversation.</p>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                Use your existing SavDown account to add a comment and manage your own contributions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signIn(undefined, { callbackUrl: window.location.href })}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Sign in to comment
          </button>
        </div>
      ) : null}

      {message && (
        <p className="mt-4 rounded-xl bg-primary-light px-4 py-3 text-sm text-primary" role="status">
          {message}
        </p>
      )}

      <div className="mt-8 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading comments…
          </div>
        ) : null}

        {!loading && comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center dark:bg-card">
            <MessageCircle className="mx-auto h-6 w-6 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-text">Start the conversation</p>
            <p className="mt-1 text-xs text-text-subtle">Be the first to add a thoughtful question or helpful tip.</p>
          </div>
        ) : null}

        {comments.map((comment) => (
          <article key={comment.id} className="rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card">
            <div className="flex gap-3">
              {comment.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={comment.user.image} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-light text-xs font-bold text-primary">
                  {initials(comment.user.name)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-semibold text-text">{comment.user.name}</p>
                  <time dateTime={comment.createdAt} className="text-xs text-text-subtle">
                    {formatCommentDate(comment.createdAt)}
                  </time>
                  {comment.status === 'PENDING' && comment.isOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-warning">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> In review
                    </span>
                  ) : null}
                </div>

                {editing === comment.id ? (
                  <div className="mt-3">
                    <textarea
                      value={editingBody}
                      onChange={(event) => setEditingBody(event.target.value)}
                      maxLength={2000}
                      rows={3}
                      aria-label="Edit your comment"
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void updateComment(comment.id, 'edit', editingBody)}
                        disabled={editingBody.trim().length < 2}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Save
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-text-muted hover:bg-surface">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-muted">{comment.body}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
                  {comment.isOwner && editing !== comment.id ? (
                    <button
                      type="button"
                      onClick={() => { setEditing(comment.id); setEditingBody(comment.body); }}
                      className="inline-flex items-center gap-1 text-text-muted transition-colors hover:text-primary"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                    </button>
                  ) : null}
                  {comment.isOwner ? (
                    <button
                      type="button"
                      onClick={() => void removeComment(comment.id)}
                      className="inline-flex items-center gap-1 text-text-muted transition-colors hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => report(comment.id)}
                      className="inline-flex items-center gap-1 text-text-muted transition-colors hover:text-amber-700"
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
