'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, EyeOff, Loader2, Search, ShieldAlert, Trash2 } from 'lucide-react';

type AdminComment = { id: string; postSlug: string; body: string; status: 'PENDING' | 'APPROVED' | 'HIDDEN' | 'REJECTED'; reportReason: string | null; reportedAt: string | null; createdAt: string; user: { name: string | null; email: string | null; image: string | null }; moderator: { name: string | null; email: string | null } | null };

const statusStyles: Record<AdminComment['status'], string> = { PENDING: 'bg-amber-50 text-amber-700', APPROVED: 'bg-emerald-50 text-emerald-700', HIDDEN: 'bg-slate-100 text-slate-600', REJECTED: 'bg-rose-50 text-rose-700' };

export function AdminCommentsClient() {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [pendingId, setPendingId] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: '50' });
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const response = await fetch(`/api/admin/comments?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? 'Unable to load comments.');
      setComments(payload.data.comments ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load comments.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { const timer = window.setTimeout(() => void load(), search ? 250 : 0); return () => window.clearTimeout(timer); }, [status, search]);

  const act = async (id: string, action: 'approve' | 'hide' | 'reject' | 'delete') => {
    setPendingId(id + action);
    try {
      const response = await fetch(`/api/admin/comments/${id}`, action === 'delete' ? { method: 'DELETE' } : { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? 'Unable to update comment.');
      setMessage(payload.data.message ?? 'Comment updated.');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update comment.'); }
    finally { setPendingId(''); }
  };

  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search author, article, or comment" className="h-10 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-xl border border-border bg-white px-3 text-sm text-text"><option value="all">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="HIDDEN">Hidden</option><option value="REJECTED">Rejected</option></select></div>{message && <p className="rounded-xl bg-primary-light px-4 py-3 text-sm text-primary" role="status">{message}</p>}{loading ? <div className="flex items-center gap-2 rounded-2xl border border-border bg-white p-6 text-sm text-text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading commentsâ€¦</div> : null}{!loading && comments.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-text-muted">No comments match the current filters.</div> : null}{comments.map((comment) => <article key={comment.id} className="rounded-2xl border border-border bg-white p-5 shadow-soft"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-text">{comment.user.name ?? comment.user.email ?? 'SavDown user'}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusStyles[comment.status]}`}>{comment.status}</span>{comment.reportedAt && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700"><ShieldAlert className="h-3 w-3" /> Reported</span>}</div><p className="mt-1 text-xs text-text-subtle">{comment.user.email ?? 'No email'} Â· {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(comment.createdAt))}</p><Link href={`/blog/${comment.postSlug}`} target="_blank" className="mt-3 inline-block text-xs font-semibold text-primary hover:text-primary-hover">/blog/{comment.postSlug}</Link><p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-text-muted">{comment.body}</p>{comment.reportReason && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">Report note: {comment.reportReason}</p>}</div><div className="flex flex-wrap gap-2 lg:w-52 lg:justify-end"><button type="button" disabled={Boolean(pendingId)} onClick={() => void act(comment.id, 'approve')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"><Check className="h-3 w-3" /> Approve</button><button type="button" disabled={Boolean(pendingId)} onClick={() => void act(comment.id, 'hide')} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"><EyeOff className="h-3 w-3" /> Hide</button><button type="button" disabled={Boolean(pendingId)} onClick={() => void act(comment.id, 'delete')} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"><Trash2 className="h-3 w-3" /> Delete</button></div></div></article>)}</div>;
}