'use client';

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, CircleHelp, Loader2, MessageCircle, Paperclip, Send, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type Attachment = { id: string; fileName: string; contentType: string; size: number };
type Message = { id: string; senderType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM'; body: string; createdAt: string; attachments: Attachment[] };
type Conversation = { id: string; category: string; status: string; lastMessagePreview: string; lastMessageAt: string; customerUnreadCount: number; createdAt: string };
type Detail = Conversation & { messages: Message[] };

const CATEGORIES = [
  ['GENERAL_QUESTION', 'General Question'], ['DOWNLOAD_PROBLEM', 'Download Problem'], ['TOOL_NOT_WORKING', 'Tool Not Working'], ['ACCOUNT_PROBLEM', 'Account Problem'], ['CREDITS_USAGE', 'Credits & Usage'], ['SUBSCRIPTION_BILLING', 'Subscription & Billing'], ['REFUND_REQUEST', 'Refund Request'], ['REPORT_A_PROBLEM', 'Report a Problem'], ['AFFILIATE_PARTNERSHIP', 'Affiliate / Partnership'], ['OTHER', 'Other'],
] as const;
const guestKey = 'savdown-support-guest';

function guestHeaders(): Record<string, string> {
  try { const saved = JSON.parse(localStorage.getItem(guestKey) || '{}'); return saved.token ? { 'x-support-token': saved.token } : {}; } catch { return {}; }
}
function attachmentUrl(id: string) { let token = ''; try { token = typeof window === 'undefined' ? '' : JSON.parse(localStorage.getItem(guestKey) || '{}').token || ''; } catch {} return `/api/support/attachments/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`; }
function label(category: string) { return CATEGORIES.find(([key]) => key === category)?.[1] || category.replaceAll('_', ' '); }
function time(value: string) { return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }

export function SupportChat() {
  const pathname = usePathname(); const { data: session } = useSession(); const { error } = useToast();
  const [open, setOpen] = useState(false); const [conversations, setConversations] = useState<Conversation[]>([]); const [detail, setDetail] = useState<Detail | null>(null);
  const [starting, setStarting] = useState(false); const [category, setCategory] = useState<string>(''); const [message, setMessage] = useState(''); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [files, setFiles] = useState<File[]>([]); const [sending, setSending] = useState(false); const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null); const fileRef = useRef<HTMLInputElement>(null);
  const loggedIn = !!session?.user?.id;
  const loadList = useCallback(async () => {
    if (!loggedIn) return;
    const res = await fetch('/api/support'); const data = await res.json(); if (data?.ok) setConversations(data.data.conversations || []);
  }, [loggedIn]);
  const loadDetail = useCallback(async (id: string) => {
    setLoading(true);
    try { const res = await fetch(`/api/support/${id}`, { headers: guestHeaders() }); const data = await res.json(); if (!res.ok || !data?.ok) throw new Error(data?.error); setDetail(data.data); await fetch(`/api/support/${id}/read`, { method: 'PATCH', headers: guestHeaders() }); loadList(); }
    catch (e) { error('Could not open support', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setLoading(false); }
  }, [error, loadList]);
  useEffect(() => { if (open) loadList(); }, [open, loadList]);
  const activeConversationId = detail?.id;
  useEffect(() => { if (!open || !activeConversationId) return; const poll = setInterval(() => loadDetail(activeConversationId), 15000); return () => clearInterval(poll); }, [open, activeConversationId, loadDetail]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [detail?.messages.length]);
  useEffect(() => { if (!loggedIn && open && !detail) { try { const saved = JSON.parse(localStorage.getItem(guestKey) || '{}'); if (saved.id && saved.token) loadDetail(saved.id); } catch {} } }, [loggedIn, open, detail, loadDetail]);
  if (pathname.startsWith('/admin')) return null;

  async function startConversation(e: FormEvent) {
    e.preventDefault(); if (!category || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/support', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category, message, name, email }) });
      const data = await res.json(); if (!res.ok || !data?.ok) throw new Error(data?.error || 'Could not start conversation.');
      if (data.data.guestToken) localStorage.setItem(guestKey, JSON.stringify({ id: data.data.conversation.id, token: data.data.guestToken }));
      setMessage(''); setFiles([]); await loadDetail(data.data.conversation.id); loadList();
    } catch (e) { error('Message not sent', e instanceof Error ? e.message : 'Please try again.'); } finally { setSending(false); }
  }
  async function sendMessage() {
    if (!detail || !message.trim() || sending) return; setSending(true);
    const body = new FormData(); body.set('message', message); files.forEach((file) => body.append('attachments', file));
    try { const res = await fetch(`/api/support/${detail.id}`, { method: 'POST', headers: guestHeaders(), body }); const data = await res.json(); if (!res.ok || !data?.ok) throw new Error(data?.error || 'Could not send message.'); setMessage(''); setFiles([]); await loadDetail(detail.id); loadList(); }
    catch (e) { error('Message not sent', e instanceof Error ? e.message : 'Retry when your connection returns.'); } finally { setSending(false); }
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
  const unread = conversations.reduce((sum, c) => sum + c.customerUnreadCount, 0);
  return <>
    <button type="button" aria-label="Open support" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-[90] inline-flex h-13 items-center gap-2 rounded-2xl bg-gradient-brand px-4 text-sm font-semibold text-white shadow-glow-lg transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
      <MessageCircle className="h-5 w-5" /> <span className="hidden sm:inline">Support</span>{unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread > 9 ? '9+' : unread}</span>}
    </button>
    <AnimatePresence>{open && <motion.section initial={{ opacity: 0, y: 20, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .98 }} transition={{ duration: .18 }} className="fixed inset-0 z-[105] flex flex-col bg-white sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[min(42rem,calc(100vh-2.5rem))] sm:w-[25rem] sm:rounded-3xl sm:border sm:border-border sm:shadow-soft-xl">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-light text-primary"><CircleHelp className="h-5 w-5" /></span><div><h2 className="font-bold text-text">Support</h2><p className="text-xs text-text-muted">How can we help?</p></div></div><button onClick={() => setOpen(false)} className="rounded-xl p-2 text-text-subtle hover:bg-surface"><X className="h-5 w-5" /></button></header>
      {!detail ? <div className="flex-1 overflow-y-auto p-5">{loading ? <Loading /> : loggedIn && conversations.length > 0 && !starting ? <><button onClick={() => setStarting(true)} className="mb-4 w-full rounded-xl bg-primary-light px-4 py-2.5 text-sm font-semibold text-primary">Start a new conversation</button><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-subtle">Your conversations</p><div className="space-y-2">{conversations.map(c => <button key={c.id} onClick={() => loadDetail(c.id)} className="w-full rounded-2xl border border-border p-3 text-left hover:border-primary/30 hover:bg-primary-light/30"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-text">{label(c.category)}</span>{c.customerUnreadCount > 0 && <span className="h-2 w-2 rounded-full bg-primary" />}</div><p className="mt-1 truncate text-xs text-text-muted">{c.lastMessagePreview}</p></button>)}</div></> : <StartForm />}</div> : <ConversationView />}
    </motion.section>}</AnimatePresence>
  </>;

  function StartForm() { return <form onSubmit={startConversation} className="space-y-4"><div><p className="text-sm font-semibold text-text">What can we help with?</p><div className="mt-3 grid grid-cols-2 gap-2">{CATEGORIES.map(([key, text]) => <button type="button" key={key} onClick={() => setCategory(key)} className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${category === key ? 'border-primary bg-primary-light text-primary' : 'border-border text-text-muted hover:border-primary/30'}`}>{text}</button>)}</div></div>{!loggedIn && <><p className="text-xs text-text-muted">Add your email so we can send you a reply and keep this conversation available.</p><input required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary" /><input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" className="h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-primary" /></>}<textarea required value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={5000} placeholder="Tell us what happened…" className="w-full resize-none rounded-xl border border-border p-3 text-sm outline-none focus:border-primary" /><button disabled={!category || !message.trim() || sending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{sending && <Loader2 className="h-4 w-4 animate-spin" />}Send message</button></form>; }
  function ConversationView() { const resolved = detail!.status === 'RESOLVED' || detail!.status === 'CLOSED'; return <div className="flex min-h-0 flex-1 flex-col"><div className="flex items-center gap-2 border-b border-border px-4 py-3"><button onClick={() => setDetail(null)} className="rounded-lg p-1.5 hover:bg-surface"><ChevronLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-text">{label(detail!.category)}</p><p className="text-xs text-text-muted">{resolved ? 'Resolved — reply to reopen' : 'We’ll reply here as soon as we can.'}</p></div>{resolved && <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent"><Check className="h-3.5 w-3.5" /> Resolved</span>}</div><div className="flex-1 overflow-y-auto bg-surface/35 px-4 py-4">{detail!.messages.map(m => <div key={m.id} className={`mb-4 flex ${m.senderType === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${m.senderType === 'CUSTOMER' ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-white text-text shadow-soft'}`}><p className="whitespace-pre-wrap">{m.body}</p>{m.attachments.map(a => <a key={a.id} href={attachmentUrl(a.id)} target="_blank" rel="noreferrer" className={`mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${m.senderType === 'CUSTOMER' ? 'bg-white/15' : 'bg-surface text-primary'}`}><Paperclip className="h-3 w-3" />{a.fileName}</a>)}<p className={`mt-1 text-[10px] ${m.senderType === 'CUSTOMER' ? 'text-white/65' : 'text-text-subtle'}`}>{time(m.createdAt)}</p></div></div>)}<div ref={endRef} /></div><div className="shrink-0 border-t border-border bg-white p-3">{files.length > 0 && <p className="mb-2 truncate text-xs text-text-muted">{files.map(f => f.name).join(', ')}</p>}<div className="flex items-end gap-2"><input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" className="hidden" onChange={e => setFiles(Array.from(e.target.files || []).slice(0, 4))} /><button onClick={() => fileRef.current?.click()} className="mb-1 rounded-lg p-2 text-text-subtle hover:bg-surface" title="Attach file"><Paperclip className="h-4 w-4" /></button><textarea value={message} onChange={e => setMessage(e.target.value)} onKeyDown={onKeyDown} rows={1} maxLength={5000} placeholder="Write a reply…" className="max-h-28 flex-1 resize-none rounded-xl bg-surface px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary" /><button onClick={sendMessage} disabled={!message.trim() || sending} className="mb-1 rounded-xl bg-primary p-2.5 text-white disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button></div><p className="mt-1 pl-10 text-[10px] text-text-subtle">Enter to send · Shift + Enter for a new line</p></div></div>; }
}
function Loading() { return <div className="grid h-full place-items-center text-text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>; }
