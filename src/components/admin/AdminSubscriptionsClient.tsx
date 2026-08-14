'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterBar, FilterTab, EmptyState, ErrorState, Skeleton,
} from './AdminUI';

const STATUSES = ['ALL', 'active', 'trialing', 'past_due', 'canceled', 'unpaid'];

type Sub = {
  id: string; plan: string; status: string; interval: string;
  currentPeriodEnd: string | null; createdAt: string; cancelAtPeriodEnd: boolean;
  stripeSubscriptionId: string;
  user: { id: string; name: string | null; email: string | null };
};

export function AdminSubscriptionsClient() {
  const [subs, setSubs]       = useState<Sub[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search)           p.set('search', search);
    if (status !== 'ALL') p.set('status', status);
    fetch(`/api/admin/subscriptions?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setSubs(d.data.subscriptions); setTotal(d.data.total); setTotalPages(d.data.totalPages); } else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);

  if (error) return <AdminPage><PageHeader title="Subscriptions" /><ErrorState message="Failed to load subscriptions." onRetry={load} /></AdminPage>;

  return (
    <AdminPage>
      <PageHeader title="Subscriptions" description={`${total.toLocaleString()} subscriptions`} />

      <FilterBar search={search} onSearch={setSearch} placeholder="Search subscriber...">
        {STATUSES.map((s) => (
          <FilterTab
            key={s}
            label={s === 'ALL' ? 'All' : s.replace('_', ' ')}
            active={status === s}
            onClick={() => setStatus(s)}
          />
        ))}
      </FilterBar>

      <TableCard>
        <Table>
          <thead>
            <tr>
              <Th>Subscriber</Th>
              <Th>Plan</Th>
              <Th>Status</Th>
              <Th>Billing</Th>
              <Th>Renewal</Th>
              <Th>Cancelling</Th>
              <Th className="text-right">Started</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : subs.length === 0 ? (
              <tr><td colSpan={7}>
                <EmptyState
                  icon={CreditCard}
                  title="No subscriptions"
                  message={status !== 'ALL' ? 'No subscriptions with this status.' : 'Subscriptions will appear here after users subscribe.'}
                />
              </td></tr>
            ) : subs.map((s) => (
              <tr key={s.id} className="hover:bg-surface/40 transition-colors">
                <Td>
                  <Link href={`/admin/users/${s.user.id}`} className="hover:text-primary transition-colors">
                    <p className="font-medium text-text">{s.user.name ?? '—'}</p>
                    <p className="text-[11px] text-text-muted">{s.user.email}</p>
                  </Link>
                </Td>
                <Td><StatusBadge status={s.plan} /></Td>
                <Td><StatusBadge status={s.status} dot /></Td>
                <Td className="capitalize text-text-muted text-[12px]">{s.interval}</Td>
                <Td className="text-[12px] text-text-muted whitespace-nowrap tabular-nums">
                  {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}
                </Td>
                <Td>
                  {s.cancelAtPeriodEnd
                    ? <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">Yes</span>
                    : <span className="text-[12px] text-text-subtle">No</span>
                  }
                </Td>
                <Td className="text-right text-[12px] text-text-muted whitespace-nowrap tabular-nums">{new Date(s.createdAt).toLocaleDateString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
