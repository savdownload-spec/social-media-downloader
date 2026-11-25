'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  FilterBar, FilterTab, EmptyState, ErrorState, StatusBadge, Pagination, Skeleton,
} from './AdminUI';

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  emailNotificationSent: boolean;
  emailDeliveryFailed: boolean;
  createdAt: string;
  updatedAt: string;
};

const STATUS_TABS = ['ALL', 'NEW', 'IN_PROGRESS', 'RESOLVED'] as const;

function statusLabel(s: (typeof STATUS_TABS)[number]): string {
  if (s === 'IN_PROGRESS') return 'In Progress';
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export function AdminContactsTable() {
  const searchParams = useSearchParams();
  const focusedId = searchParams.get('id');

  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>('NEW');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const { success, error: errorToast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (status !== 'ALL') params.set('status', status);
    if (search.trim()) params.set('search', search.trim());

    fetch(`/api/admin/contacts?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) {
          setContacts(data.data.contacts || []);
          setTotal(data.data.total || 0);
          setTotalPages(data.data.totalPages || 1);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, status, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status, search]);

  // Auto-expand if a focusedId is passed
  useEffect(() => {
    if (focusedId) setExpanded(focusedId);
  }, [focusedId]);

  async function updateStatus(id: string, newStatus: string) {
    setPendingAction(id + newStatus);
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        errorToast('Update failed', data?.error || 'Please try again.');
        return;
      }
      success(`Marked as ${newStatus.replace('_', ' ')}`);
      window.dispatchEvent(new Event('admin-notifications:refresh'));
      load();
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setPendingAction(null);
    }
  }

  async function retryEmail(id: string) {
    setPendingAction(id + 'retry');
    try {
      const res = await fetch(`/api/admin/contacts/${id}/retry-email`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        errorToast('Retry failed', data?.error || 'Please try again.');
        return;
      }
      success('Email resent');
      load();
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div>
      <FilterBar search={search} onSearch={setSearch} placeholder="Search by name, email, or subject...">
        {STATUS_TABS.map((s) => (
          <FilterTab
            key={s}
            label={statusLabel(s)}
            active={status === s}
            onClick={() => setStatus(s)}
          />
        ))}
      </FilterBar>

      {error ? (
        <ErrorState message="Failed to load contact enquiries." onRetry={load} />
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-border-light rounded-xl p-5">
              <div className="flex gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="w-28 space-y-2">
                  <Skeleton className="h-7 w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Enquiries Found"
          message={
            status !== 'ALL'
              ? `No ${statusLabel(status).toLowerCase()} enquiries. Try a different filter.`
              : 'Contact Us submissions will appear here when visitors send a message.'
          }
        />
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => {
            const isExpanded = expanded === c.id;
            const isFocused = focusedId === c.id;
            return (
              <div
                key={c.id}
                className={`bg-white border rounded-xl overflow-hidden hover:shadow-soft transition-shadow ${isFocused ? 'border-primary ring-4 ring-primary/10' : 'border-border-light'}`}
              >
                {/* Row summary */}
                <div className="flex flex-col md:flex-row md:items-center gap-3 p-5">
                  {/* Avatar */}
                  <div className="hidden md:flex w-9 h-9 rounded-full bg-primary/[0.08] items-center justify-center text-[12px] font-bold text-primary shrink-0">
                    {(c.name || c.email)[0]?.toUpperCase() ?? '?'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-text">{c.name || '(anonymous)'}</span>
                      <StatusBadge status={c.status} dot />
                      {/* Email delivery indicator */}
                      {c.emailNotificationSent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Email sent
                        </span>
                      ) : c.emailDeliveryFailed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3" /> Email failed
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[12px] text-text-muted truncate">
                      <a href={`mailto:${c.email}`} className="hover:text-primary transition-colors">{c.email}</a>
                      {c.subject && <> · <span className="text-text-subtle">{c.subject.slice(0, 60)}{c.subject.length > 60 ? '…' : ''}</span></>}
                    </p>
                    <p className="text-[11px] text-text-subtle mt-0.5">
                      {new Date(c.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {c.emailDeliveryFailed && (
                      <button
                        onClick={() => retryEmail(c.id)}
                        disabled={pendingAction === c.id + 'retry'}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                        title="Retry sending notification email"
                      >
                        <RefreshCw className={`w-3 h-3 ${pendingAction === c.id + 'retry' ? 'animate-spin' : ''}`} />
                        Retry email
                      </button>
                    )}
                    {c.status === 'NEW' && (
                      <button
                        onClick={() => updateStatus(c.id, 'IN_PROGRESS')}
                        disabled={!!pendingAction}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors disabled:opacity-50"
                      >
                        In Progress
                      </button>
                    )}
                    {c.status !== 'RESOLVED' && (
                      <button
                        onClick={() => updateStatus(c.id, 'RESOLVED')}
                        disabled={!!pendingAction}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : c.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-text-muted bg-surface hover:bg-surface/70 hover:text-text transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {isExpanded ? 'Hide' : 'View'}
                    </button>
                  </div>
                </div>

                {/* Expanded message */}
                {isExpanded && (
                  <div className="border-t border-border-light px-5 py-4 bg-surface/50">
                    {c.subject && (
                      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Subject</p>
                    )}
                    {c.subject && <p className="text-sm text-text mb-3">{c.subject}</p>}
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Message</p>
                    <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">{c.message}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <a
                        href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject || 'Your SavDown enquiry')}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-primary bg-primary/[0.08] hover:bg-primary/[0.14] transition-colors"
                      >
                        <Mail className="w-3 h-3" /> Reply via email
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </div>
    </div>
  );
}
