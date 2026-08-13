'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterBar, FilterTab, EmptyState,
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

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search)           p.set('search', search);
    if (status !== 'ALL') p.set('status', status);
    fetch(`/api/admin/subscriptions?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setSubs(d.data.subscriptions); setTotal(d.data.total); setTotalPages(d.data.totalPages); } })
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin" title="Subscriptions" description={`${total.toLocaleString()} subscriptions`} />

      <FilterBar search={search} onSearch={setSearch} placeholder="Search user…">
        {STATUSES.map((s) => <FilterTab key={s} label={s === 'ALL' ? 'All' : s} active={status === s} onClick={() => setStatus(s)} />)}
      </FilterBar>

      <TableCard>
        <Table>
          <thead>
            <tr><Th>User</Th><Th>Plan</Th><Th>Status</Th><Th>Interval</Th><Th>Renews</Th><Th>Cancel?</Th><Th>Since</Th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-10 mx-4 my-1 rounded-lg bg-surface animate-pulse" /></td></tr>
              ))
            ) : subs.length === 0 ? (
              <tr><td colSpan={7}><EmptyState message="No subscriptions found." /></td></tr>
            ) : subs.map((s) => (
              <tr key={s.id} className="hover:bg-surface/40">
                <Td>
                  <Link href={`/admin/users/${s.user.id}`} className="hover:text-primary transition-colors">
                    <p className="font-medium">{s.user.name ?? '—'}</p>
                    <p className="text-xs text-text-muted">{s.user.email}</p>
                  </Link>
                </Td>
                <Td><StatusBadge status={s.plan} /></Td>
                <Td><StatusBadge status={s.status} /></Td>
                <Td className="capitalize text-text-muted">{s.interval}</Td>
                <Td className="text-xs text-text-muted">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}</Td>
                <Td>{s.cancelAtPeriodEnd ? <span className="text-xs text-amber-600 font-semibold">Yes</span> : <span className="text-xs text-text-muted">No</span>}</Td>
                <Td className="text-xs text-text-muted">{new Date(s.createdAt).toLocaleDateString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
