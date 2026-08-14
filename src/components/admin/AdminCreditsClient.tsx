'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Coins, TrendingUp, TrendingDown, Hash } from 'lucide-react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterBar, FilterTab, EmptyState, ErrorState,
  StatCard, Skeleton,
} from './AdminUI';

const KINDS = ['ALL', 'purchase', 'plan_refill', 'plan_grant', 'spend', 'refund', 'adjustment'];

type Tx = {
  id: string; amount: number; kind: string; bucket: string;
  description: string | null; createdAt: string; externalId: string | null;
  user: { id: string; name: string | null; email: string | null } | null;
};

export function AdminCreditsClient() {
  const [txs, setTxs]         = useState<Tx[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ totalIssued: 0, totalSpent: 0 });
  const [search, setSearch]   = useState('');
  const [kind, setKind]       = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search)       p.set('search', search);
    if (kind !== 'ALL') p.set('kind', kind);
    fetch(`/api/admin/credits?${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setTxs(d.data.transactions); setTotal(d.data.total);
          setTotalPages(d.data.totalPages); setSummary(d.data.summary);
        } else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, search, kind]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, kind]);

  if (error) return <AdminPage><PageHeader title="Credits" /><ErrorState message="Failed to load credit data." onRetry={load} /></AdminPage>;

  const netRemaining = summary.totalIssued - summary.totalSpent;

  return (
    <AdminPage>
      <PageHeader title="Credits" description="Credit ledger and transaction history" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Issued" value={summary.totalIssued.toLocaleString()} icon={TrendingUp} accent="green" />
        <StatCard label="Total Spent" value={summary.totalSpent.toLocaleString()} icon={TrendingDown} accent="rose" />
        <StatCard label="Net Remaining" value={netRemaining.toLocaleString()} icon={Coins} accent="purple" />
        <StatCard label="Transactions" value={total.toLocaleString()} icon={Hash} accent="blue" />
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Search user or description...">
        {KINDS.map((k) => (
          <FilterTab
            key={k}
            label={k === 'ALL' ? 'All' : k.replace('_', ' ')}
            active={kind === k}
            onClick={() => setKind(k)}
          />
        ))}
      </FilterBar>

      <TableCard>
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Type</Th>
              <Th>Bucket</Th>
              <Th className="text-right">Amount</Th>
              <Th>Description</Th>
              <Th className="text-right">Date</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : txs.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState
                  icon={Coins}
                  title="No transactions"
                  message={kind !== 'ALL' ? 'No transactions of this type found.' : 'Credit transactions will appear here.'}
                />
              </td></tr>
            ) : txs.map((t) => (
              <tr key={t.id} className="hover:bg-surface/40 transition-colors">
                <Td>
                  {t.user ? (
                    <Link href={`/admin/users/${t.user.id}`} className="hover:text-primary transition-colors">
                      <p className="font-medium text-text">{t.user.name ?? '—'}</p>
                      <p className="text-[11px] text-text-muted">{t.user.email}</p>
                    </Link>
                  ) : <span className="text-text-muted">System</span>}
                </Td>
                <Td><StatusBadge status={t.kind} /></Td>
                <Td><span className="text-[12px] text-text-muted capitalize">{t.bucket}</span></Td>
                <Td className="text-right">
                  <span className={`font-semibold tabular-nums ${t.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </span>
                </Td>
                <Td className="text-text-muted max-w-[200px] truncate text-[12px]">{t.description ?? '—'}</Td>
                <Td className="text-right text-[12px] text-text-muted whitespace-nowrap tabular-nums">{new Date(t.createdAt).toLocaleDateString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
