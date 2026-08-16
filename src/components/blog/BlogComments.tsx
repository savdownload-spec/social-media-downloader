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
      setMessage('Thanks â€” your comment was submitted for review.');
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
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Community</p>
          <h2 id="comments-heading" className="mt-2 text-2xl font-semibold tracking-tight text-text">Join the conversation</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">Helpful, respectful discussion keeps each guide better for everyone.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary"><MessageCircle className="h-3.5 w-3.5" />{comments.length}</span>
      </div>

      {authStatus === 'authenticated' && session?.user ? (
        <div className="mt-7 rounded-2xl border border-border bg-surface/55 p-4 md:p-5">
          <label htmlFor="blog-comment" className="text-sm font-semibold text-text">Add your perspective</label>
          <textarea id="blog-comment" value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} rows={4} placeholder="Share a useful tip, question, or clarificationâ€¦" className="mt-3 w-full resize-y rounded-xl border border-border bg-white dark:bg-card px-4 py-3 text-sm leading-6 text-text outline-none transition-shadow placeholder:text-text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-text-subtle">{body.length}/2000 Â· Comments are reviewed before publication.</p>
            <button type="button" onClick={submit} disabled={submitting || body.trim().length < 2} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit comment
            </button>
          </div>
        </div>
      ) : authStatus !== 'loading' ? (
        <div className="mt-7 rounded-2xl border border-border bg-surface/55 p-5">
          <p className="font-medium text-text">Sign in to join the conversation.</p>
          <p className="mt-1 text-sm leading-6 text-text-muted">Use your existing SavDown account to add a comment, edit your own contribution, and follow the discussion.</p>
          <button type="button" onClick={() => void signIn(undefined, { callbackUrl: window.location.href })} className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover">Sign in to comment</button>
        </div>
      ) : null}

      {message && <p className="mt-4 rounded-xl bg-primary-light px-4 py-3 text-sm text-primary" role="status">{message}</p>}

      <div className="mt-8 space-y-5">
        {loading ? <div className="flex items-center gap-2 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading commentsâ€¦</div> : null}
        {!loading && comments.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-white dark:bg-card p-6 text-sm text-text-muted">Be the first to add a thoughtful question or helpful tip.</div> : null}
        {comments.map((comment) => (
          <article key={comment.id} className="rounded-2xl border border-border bg-white dark:bg-card p-5 shadow-soft">
            <div className="flex gap-3">
              {comment.user.image ? <img src={comment.user.image} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">{initials(comment.user.name)}</span>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-semibold text-text">{comment.user.name}</p>
                  <span className="text-xs text-text-subtle">{formatCommentDate(comment.createdAt)}</span>
                  {comment.status === 'PENDING' && comment.isOwner ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-warning"><AlertTriangle className="h-3 w-3" /> In review</span> : null}
                </div>
                {editing === comment.id ? (
                  <div className="mt-3">
                    <textarea value={editingBody} onChange={(event) => setEditingBody(event.target.value)} maxLength={2000} rows={3} className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
                    <div className="mt-2 flex gap-2"><button type="button" onClick={() => void updateComment(comment.id, 'edit', editingBody)} disabled={editingBody.trim().length < 2} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" /> Save</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-text-muted hover:bg-surface">Cancel</button></div>
                  </div>
                ) : <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-muted">{comment.body}</p>}
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
                  {comment.isOwner && editing !== comment.id ? <button type="button" onClick={() => { setEditing(comment.id); setEditingBody(comment.body); }} className="inline-flex items-center gap-1 text-text-muted hover:text-primary"><Edit3 className="h-3.5 w-3.5" /> Edit</button> : null}
                  {comment.isOwner ? <button type="button" onClick={() => void removeComment(comment.id)} className="inline-flex items-center gap-1 text-text-muted hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button> : <button type="button" onClick={() => report(comment.id)} className="inline-flex items-center gap-1 text-text-muted hover:text-amber-700"><Flag className="h-3.5 w-3.5" /> Report</button>}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}