'use client';

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Coins,
  CreditCard,
  DownloadCloud,
  Flag,
  Handshake,
  Headset,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  ReceiptText,
  Send,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { playOpen, playClose, playTap, playTick, playSend, playSuccess, playReceive, playAttach, playRemove, playBack } from '@/lib/sounds';

type Attachment = { id: string; fileName: string; contentType: string; size: number };
type Message = { id: string; senderType: 'CUSTOMER' | 'ADMIN' | 'SYSTEM'; body: string; originalMessage?: string | null; detectedLanguage?: string | null; translatedMessage?: string | null; translationStatus?: string | null; createdAt: string; attachments: Attachment[] };
type Conversation = { id: string; category: string; status: string; lastMessagePreview: string; lastMessageAt: string; customerUnreadCount: number; createdAt: string };
type Detail = Conversation & { messages: Message[] };

/**
 * Category metadata for the UI only — the `key` values are the exact enum the
 * backend expects (see SUPPORT_CATEGORIES in @/lib/support), so the data
 * contract is unchanged; this just adds an icon, one-line description and a
 * contextual placeholder for each. The first six are the primary topics; the
 * rest sit behind "More topics".
 */
type CategoryMeta = { key: string; label: string; desc: string; placeholder: string; icon: LucideIcon };

const CATEGORIES: CategoryMeta[] = [
  { key: 'DOWNLOAD_PROBLEM', label: 'Download Problem', desc: 'Something went wrong with a download.', placeholder: 'Tell us what went wrong with your download…', icon: DownloadCloud },
  { key: 'TOOL_NOT_WORKING', label: 'Tool Not Working', desc: "A tool isn't working correctly.", placeholder: "Which tool isn't working, and what happened?", icon: Wrench },
  { key: 'ACCOUNT_PROBLEM', label: 'Account Problem', desc: 'Login, profile, or account issues.', placeholder: 'Tell us about your account issue…', icon: UserRound },
  { key: 'CREDITS_USAGE', label: 'Credits & Usage', desc: 'Questions about credits or usage.', placeholder: 'What would you like to know about credits?', icon: Coins },
  { key: 'SUBSCRIPTION_BILLING', label: 'Subscription & Billing', desc: 'Plans, payments, or invoices.', placeholder: 'Tell us about your billing or subscription question…', icon: CreditCard },
  { key: 'GENERAL_QUESTION', label: 'General Question', desc: 'A general question about SavDown.', placeholder: 'How can we help?', icon: CircleHelp },
  { key: 'REFUND_REQUEST', label: 'Refund Request', desc: 'Request a refund on a purchase.', placeholder: 'Tell us about your refund request…', icon: ReceiptText },
  { key: 'REPORT_A_PROBLEM', label: 'Report a Problem', desc: 'Report a bug or something broken.', placeholder: 'Describe the problem you ran into…', icon: Flag },
  { key: 'AFFILIATE_PARTNERSHIP', label: 'Affiliate / Partnership', desc: 'Work with us or partner up.', placeholder: 'Tell us about your partnership idea…', icon: Handshake },
  { key: 'OTHER', label: 'Other', desc: 'Something else entirely.', placeholder: 'Tell us what happened…', icon: MoreHorizontal },
];
const PRIMARY_COUNT = 6;
const guestKey = 'savdown-support-guest';

function guestHeaders(): Record<string, string> {
  try { const saved = JSON.parse(localStorage.getItem(guestKey) || '{}'); return saved.token ? { 'x-support-token': saved.token } : {}; } catch { return {}; }
}
function attachmentUrl(id: string) { let token = ''; try { token = typeof window === 'undefined' ? '' : JSON.parse(localStorage.getItem(guestKey) || '{}').token || ''; } catch {} return `/api/support/attachments/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`; }
function meta(category: string): CategoryMeta { return CATEGORIES.find((c) => c.key === category) ?? { key: category, label: category.replaceAll('_', ' '), desc: '', placeholder: 'Tell us what happened…', icon: CircleHelp }; }
function label(category: string) { return meta(category).label; }
function time(value: string) { return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function statusLabel(status: string) { return status === 'RESOLVED' || status === 'CLOSED' ? 'Resolved' : status === 'PENDING' ? 'Awaiting your reply' : 'Open'; }
function resizeTextarea(element: HTMLTextAreaElement) { element.style.height = 'auto'; const max = 176; const height = Math.min(element.scrollHeight, max); element.style.height = `${height}px`; element.style.overflowY = element.scrollHeight > max ? 'auto' : 'hidden'; }

export function SupportChat() {
  const pathname = usePathname(); const { data: session } = useSession();
  const [open, setOpen] = useState(false); const [conversations, setConversations] = useState<Conversation[]>([]); const [detail, setDetail] = useState<Detail | null>(null);
  const [starting, setStarting] = useState(false); const [category, setCategory] = useState<string>(''); const [message, setMessage] = useState(''); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [files, setFiles] = useState<File[]>([]); const [sending, setSending] = useState(false); const [loading, setLoading] = useState(false);
  const [showMore, setShowMore] = useState(false); const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0); const [translatingId, setTranslatingId] = useState<string | null>(null); const [showTranslation, setShowTranslation] = useState<Record<string, boolean>>({}); const [copiedTranslationId, setCopiedTranslationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null); const fileRef = useRef<HTMLInputElement>(null); const composerRef = useRef<HTMLTextAreaElement>(null);
  const loggedIn = !!session?.user?.id; const { language } = useLanguage(); const isRtl = language.code === 'ar' || language.code === 'ur'; const { error, success } = useToast();
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
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const viewport = window.visualViewport;
    const syncKeyboard = () => setKeyboardInset(viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    syncKeyboard();
    viewport?.addEventListener('resize', syncKeyboard); viewport?.addEventListener('scroll', syncKeyboard);
    window.addEventListener('resize', syncKeyboard);
    return () => { document.body.style.overflow = previousOverflow; viewport?.removeEventListener('resize', syncKeyboard); viewport?.removeEventListener('scroll', syncKeyboard); window.removeEventListener('resize', syncKeyboard); setKeyboardInset(0); };
  }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [detail?.messages.length]);
  useEffect(() => { if (!loggedIn && open && !detail) { try { const saved = JSON.parse(localStorage.getItem(guestKey) || '{}'); if (saved.id && saved.token) loadDetail(saved.id); } catch {} } }, [loggedIn, open, detail, loadDetail]);
  if (pathname.startsWith('/admin')) return null;

  function resetComposer() { setCategory(''); setMessage(''); setFiles([]); setShowMore(false); }

  async function startConversation(e: FormEvent) {
    e.preventDefault(); if (!category || !message.trim()) return;
    setSending(true); playSend();
    try {
      const res = await fetch('/api/support', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category, message, name, email }) });
      const data = await res.json(); if (!res.ok || !data?.ok) throw new Error(data?.error || 'Could not start conversation.');
      if (data.data.guestToken) localStorage.setItem(guestKey, JSON.stringify({ id: data.data.conversation.id, token: data.data.guestToken }));
      setJustCreatedId(data.data.conversation.id); playSuccess();
      setMessage(''); setFiles([]); await loadDetail(data.data.conversation.id); loadList();
    } catch (e) { error('Message not sent', e instanceof Error ? e.message : 'Please try again.'); } finally { setSending(false); }
  }
  async function sendMessage() {
    if (!detail || !message.trim() || sending) return; setSending(true); playSend();
    const body = new FormData(); body.set('message', message); files.forEach((file) => body.append('attachments', file));
    try { const res = await fetch(`/api/support/${detail.id}`, { method: 'POST', headers: guestHeaders(), body }); const data = await res.json(); if (!res.ok || !data?.ok) throw new Error(data?.error || 'Could not send message.'); playReceive(); setMessage(''); setFiles([]); await loadDetail(detail.id); loadList(); }
    catch (e) { error('Message not sent', e instanceof Error ? e.message : 'Retry when your connection returns.'); } finally { setSending(false); }
  }
  async function translateMessage(target: Message) {
    if (!target.detectedLanguage || target.detectedLanguage === 'en' || translatingId) return;
    setTranslatingId(target.id);
    try {
      const res = await fetch(`/api/support/messages/${target.id}/translate`, { method: 'POST', headers: guestHeaders() });
      const data = await res.json();
      if (!res.ok || !data?.ok || data.data?.translationStatus === 'FAILED') throw new Error('Translation is temporarily unavailable.');
      const translated = data.data as Message;
      setDetail((current) => current ? { ...current, messages: current.messages.map((item) => item.id === translated.id ? { ...item, ...translated } : item) } : current);
      setShowTranslation((current) => ({ ...current, [target.id]: true }));
    } catch (e) { error('Could not translate message', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setTranslatingId(null); }
  }

  async function copyTranslation(target: Message) {
    if (!target.translatedMessage) return;
    try { await navigator.clipboard.writeText(target.translatedMessage); setCopiedTranslationId(target.id); success('Translation copied'); window.setTimeout(() => setCopiedTranslationId((current) => current === target.id ? null : current), 1400); }
    catch { error('Could not copy translation', 'Please select the translated text and copy it manually.'); }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }

  const unread = conversations.reduce((sum, c) => sum + c.customerUnreadCount, 0);

  return <>
    {/* ── Floating trigger ─────────────────────────────────────────────── */}
    {!open && (
      <button
        type="button"
        aria-label="Open support"
        onClick={() => { setOpen(true); playOpen(); }}
        className="group fixed bottom-5 right-5 z-[90] inline-flex h-14 items-center gap-2.5 rounded-full bg-gradient-brand bg-[length:200%_200%] pl-2.5 pr-4 text-sm font-semibold text-white shadow-glow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-[position:100%_50%] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:pr-5"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 transition-transform duration-200 group-hover:scale-105">
          <Headset className="h-5 w-5" />
        </span>
        <span className="hidden sm:inline">Support</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    )}

    {/* ── Panel: mobile bottom sheet · desktop floating card ───────────── */}
    <AnimatePresence>
      {open && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
            onClick={() => { setOpen(false); playClose(); }}
            className="fixed inset-0 z-[100] bg-ink/30 backdrop-blur-[2px] sm:hidden"
            aria-hidden
          />
          <motion.section
            initial={{ opacity: 0, y: 24, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 z-[105] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl border border-border bg-white shadow-soft-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-h-[min(40rem,calc(100dvh-2.5rem))] sm:w-[400px] sm:rounded-3xl"
            style={{ bottom: keyboardInset > 0 ? `${keyboardInset}px` : undefined }}
            role="dialog"
            aria-label="Support"
          >
            {detail ? ConversationView() : StartFlow()}
          </motion.section>
        </>
      )}
    </AnimatePresence>
  </>;

  // ── Header shared by both states ────────────────────────────────────────
  function Header({ onBack, subtitle }: { onBack?: () => void; subtitle?: React.ReactNode }) {
    return (
      <header dir={isRtl ? 'rtl' : 'ltr'} className="flex shrink-0 items-center gap-3 border-b border-border-light px-4 py-3.5">
        {onBack ? (
          <button onClick={() => { onBack(); playBack(); }} aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-text-muted transition-colors hover:bg-surface">
            <ArrowLeft className="h-4.5 w-4.5" />
          </button>
        ) : (
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white shadow-soft">
            <Headset className="h-4.5 w-4.5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold leading-tight text-text">Support</h2>
          <p className="truncate text-xs text-text-muted">{subtitle ?? "We're here to help."}</p>
        </div>
        <LanguageSelector variant="header" />
        <button onClick={() => { setOpen(false); playClose(); }} aria-label="Close support" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-text-subtle transition-colors hover:bg-surface hover:text-text">
          <X className="h-4.5 w-4.5" />
        </button>
      </header>
    );
  }

  function StatusLine() {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
        Usually replies within a few hours
      </span>
    );
  }

  // ── Start flow: category picker → composer (progressive disclosure) ─────
  function StartFlow() {
    // Logged-in users with history see their conversations first.
    if (loading && !detail) return <><Header /><Loading /></>;

    if (loggedIn && conversations.length > 0 && !starting) {
      return (
        <>
          <Header subtitle={<StatusLine />} />
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <button onClick={() => { setStarting(true); resetComposer(); playTap(); }} className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-shadow hover:shadow-soft-md">
              <Plus className="h-4 w-4" /> New conversation
            </button>
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-text-subtle">Your conversations</p>
            <div className="space-y-2">
              {conversations.map((c) => {
                const M = meta(c.category).icon;
                return (
                  <button key={c.id} onClick={() => { loadDetail(c.id); playTap(); }} className="flex w-full items-center gap-3 rounded-xl border border-border-light bg-white p-3 text-left transition-all hover:border-primary/30 hover:shadow-soft">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-light text-primary"><M className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-text">{label(c.category)}</span>
                        {c.customerUnreadCount > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-text-muted">{c.lastMessagePreview}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      );
    }

    const hasHistory = loggedIn && conversations.length > 0;
    const picking = !category;
    const shown = showMore ? CATEGORIES : CATEGORIES.slice(0, PRIMARY_COUNT);
    const canSend = !!category && !!message.trim() && (loggedIn || (!!name.trim() && !!email.trim()));

    return (
      <>
        <Header onBack={picking ? (hasHistory ? () => setStarting(false) : undefined) : () => setCategory('')} subtitle={<StatusLine />} />
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <AnimatePresence mode="wait">
            {picking ? (
              <motion.div key="pick" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.16 }}>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-text">How can we help?</h3>
                  <p className="mt-1 text-sm text-text-muted">Choose a topic or tell us what happened and our team will help you out.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {shown.map(({ key, label: text, desc, icon: Icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { setCategory(key); playTap(); }}
                      className="group flex flex-col gap-1.5 rounded-xl border border-border-light bg-white p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-[13px] font-semibold leading-tight text-text">{text}</span>
                      <span className="line-clamp-2 text-[11px] leading-snug text-text-subtle">{desc}</span>
                    </button>
                  ))}
                </div>
                {!showMore && (
                  <button onClick={() => { setShowMore(true); playTick(); }} className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-border-light py-2.5 text-xs font-semibold text-text-muted transition-colors hover:border-primary/30 hover:text-primary">
                    More topics
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.form key="compose" onSubmit={startConversation} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.16 }} className="space-y-3">
                {/* selected category */}
                <div className="flex items-center gap-2.5 rounded-xl bg-primary-light/50 px-3 py-2.5">
                  {(() => { const Icon = meta(category).icon; return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-soft"><Icon className="h-4 w-4" /></span>; })()}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text">{label(category)}</span>
                    <span className="block truncate text-[11px] text-text-muted">{meta(category).desc}</span>
                  </span>
                  <button type="button" onClick={() => { setCategory(''); playTick(); }} className="text-xs font-semibold text-primary hover:underline">Change</button>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-text">Tell us what happened</label>
                  <textarea
                    required autoFocus aria-label="Support message" value={message} onChange={(e) => { setMessage(e.target.value); resizeTextarea(e.currentTarget); }} rows={4} maxLength={5000}
                    placeholder={meta(category).placeholder} dir={isRtl ? 'rtl' : 'ltr'}
                    style={{ textAlign: isRtl ? 'right' : 'left', minHeight: 110 }}
                    className="w-full resize-none rounded-xl border border-border bg-white p-3 text-sm leading-relaxed outline-none transition-shadow placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                  {message.length > 4000 && <p className="mt-1 text-right text-[11px] text-text-subtle">{message.length} / 5000</p>}
                </div>

                {!loggedIn && (
                  <div className="space-y-2 rounded-xl border border-border-light bg-surface/50 p-3">
                    <p className="text-[11px] text-text-muted">Add your email so our team can reply to you.</p>
                    <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15" />
                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15" />
                  </div>
                )}

                <button disabled={!canSend || sending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand bg-[length:200%_200%] px-4 py-3 text-sm font-semibold text-white shadow-soft transition-all hover:bg-[position:100%_50%] disabled:cursor-not-allowed disabled:opacity-50">
                  {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send message</>}
                </button>

                {loggedIn && session?.user?.email && (
                  <p className="text-center text-[11px] text-text-subtle">Signed in as {session.user.email}</p>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </>
    );
  }

  // ── Conversation view ───────────────────────────────────────────────────
  function ConversationView() {
    const d = detail!;
    const resolved = d.status === 'RESOLVED' || d.status === 'CLOSED';
    const justCreated = justCreatedId === d.id;
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <Header
          onBack={() => { setDetail(null); setJustCreatedId(null); }}
          subtitle={
            <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
              <span className={`h-2 w-2 rounded-full ${resolved ? 'bg-text-subtle' : 'bg-accent'}`} />
              {label(d.category)} · {statusLabel(d.status)}
            </span>
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto bg-surface/40 px-4 py-4">
          {justCreated && (
            <div className="mb-4 rounded-xl border border-accent/20 bg-accent-light/60 p-3.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-text"><Check className="h-4 w-4 text-accent-hover" /> Message sent</p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">Thanks for reaching out. Our support team will get back to you right here.</p>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-subtle">
                <span>Ref <span className="font-medium text-text-muted">#{d.id.slice(-6).toUpperCase()}</span></span>
                <span>{label(d.category)}</span>
                <span>{statusLabel(d.status)}</span>
              </div>
            </div>
          )}

          {d.messages.map((m) => {
            const mine = m.senderType === 'CUSTOMER';
            const system = m.senderType === 'SYSTEM';
            if (system) return <p key={m.id} className="my-3 text-center text-[11px] text-text-subtle">{m.body}</p>;
            return (
              <div key={m.id} className={`mb-3 flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${mine ? 'rounded-br-sm bg-primary text-white' : 'rounded-bl-sm border border-border-light bg-white text-text shadow-soft'}`}>
                  <p className="whitespace-pre-wrap break-words" dir={isRtl ? 'rtl' : 'ltr'} style={{ textAlign: isRtl ? 'right' : 'left' }}>{m.originalMessage || m.body}</p>
                  {mine && m.detectedLanguage && m.detectedLanguage !== 'en' && (
                    <div dir="ltr" className="mt-2 border-t border-white/15 pt-2 text-left">
                      <p className="text-[10px] font-medium opacity-70">Detected language: {m.detectedLanguage}</p>
                      {m.translatedMessage && showTranslation[m.id] && <p className="mt-1 rounded-lg bg-black/10 p-2 text-[13px] leading-relaxed text-left">{m.translatedMessage}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {m.translatedMessage && <button type="button" onClick={() => setShowTranslation((current) => ({ ...current, [m.id]: !current[m.id] }))} className="text-[11px] font-semibold underline-offset-2 hover:underline">{showTranslation[m.id] ? 'Show Original' : 'Show Translation'}</button>}
                        {!m.translatedMessage && <button type="button" onClick={() => translateMessage(m)} disabled={translatingId === m.id} className="text-[11px] font-semibold underline-offset-2 hover:underline">{translatingId === m.id ? 'Translating…' : 'Translate to English'}</button>}
                        {m.translatedMessage && <button type="button" onClick={() => copyTranslation(m)} className="text-[11px] font-semibold underline-offset-2 hover:underline">{copiedTranslationId === m.id ? 'Copied' : 'Copy Translation'}</button>}
                      </div>
                    </div>
                  )}
                  {m.attachments.map((a) => (
                    <a key={a.id} href={attachmentUrl(a.id)} target="_blank" rel="noreferrer" className={`mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${mine ? 'bg-white/15 text-white' : 'bg-surface text-primary'}`}>
                      <Paperclip className="h-3 w-3 shrink-0" /> <span className="truncate">{a.fileName}</span>
                    </a>
                  ))}
                  <p className={`mt-1 text-[10px] ${mine ? 'text-white/65' : 'text-text-subtle'}`}>{time(m.createdAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border-light bg-white px-3 pt-2.5" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
          {files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {files.map((f, i) => (
                <span key={i} className="inline-flex max-w-[12rem] items-center gap-1 rounded-lg border border-border-light bg-surface py-1 pl-2 pr-1 text-[11px] text-text-muted">
                  <Paperclip className="h-3 w-3 shrink-0 text-text-subtle" />
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => { setFiles(files.filter((_, j) => j !== i)); playRemove(); }} className="grid h-4 w-4 shrink-0 place-items-center rounded text-text-subtle hover:bg-border-light hover:text-text" aria-label={`Remove ${f.name}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div dir="ltr" className="flex items-end gap-2 rounded-2xl border border-border bg-white p-2 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
            <textarea ref={composerRef} aria-label="Reply message" value={message} onChange={(e) => { setMessage(e.target.value); resizeTextarea(e.currentTarget); }} onKeyDown={onKeyDown} rows={3} maxLength={5000} placeholder={resolved ? 'Reply to reopen this conversation…' : 'Write a reply…'} dir={isRtl ? 'rtl' : 'ltr'} style={{ textAlign: isRtl ? 'right' : 'left', minHeight: 110 }} className="max-h-44 min-h-[110px] flex-1 resize-none bg-transparent p-2.5 text-sm leading-relaxed outline-none placeholder:text-text-subtle" />
            <div className="flex shrink-0 items-center gap-1.5 pb-1">
              <input ref={fileRef} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" className="hidden" onChange={(e) => { const f = Array.from(e.target.files || []).slice(0, 4); setFiles(f); if (f.length) playAttach(); }} />
              <button type="button" onClick={() => fileRef.current?.click()} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-text-subtle transition-colors hover:bg-surface hover:text-primary" title="Attach screenshot" aria-label="Attach screenshot">
                <Plus className="h-5 w-5" />
              </button>
              <button type="button" onClick={sendMessage} disabled={!message.trim() || sending} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-brand text-white shadow-soft transition-opacity disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="mt-1 px-1 text-[10px] text-text-subtle">Enter to send · Shift + Enter for a new line</p>
        </div>
      </div>
    );
  }
}

function Loading() { return <div className="grid flex-1 place-items-center text-text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>; }
