'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterBar, FilterTab, EmptyState,
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

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search)       p.set('search', search);
    if (kind !== 'ALL') p.set('kind', kind);
    fetch(`/api/admin/credits?${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setTxs(d.data.transactions); setTotal(d.data.total);
          setTotalPages(d.data.totalPages); setSummary(d.data.summary);
        }
      })
      .finally(() => setLoading(false));
  }, [page, search, kind]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, kind]);

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin" title="Credits" description="Credit ledger and manual adjustments" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Issued',   value: summary.totalIssued },
          { label: 'Total Spent',    value: summary.totalSpent },
          { label: 'Net Remaining',  value: summary.totalIssued - summary.totalSpent },
          { label: 'Transactions',   value: total },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-border rounded-2xl p-4 shadow-soft">
            <p className="text-xs text-text-muted mb-1">{label}</p>
            <p className="text-xl font-bold text-text">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Search user or description…">
        {KINDS.map((k) => <FilterTab key={k} label={k === 'ALL' ? 'All' : k} active={kind === k} onClick={() => setKind(k)} />)}
      </FilterBar>

      <TableCard>
        <Table>
          <thead>
            <tr><Th>User</Th><Th>Type</Th><Th>Bucket</Th><Th>Amount</Th><Th>Description</Th><Th>Date</Th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6}><div className="h-10 mx-4 my-1 rounded-lg bg-surface animate-pulse" /></td></tr>
              ))
            ) : txs.length === 0 ? (
              <tr><td colSpan={6}><EmptyState message="No transactions." /></td></tr>
            ) : txs.map((t) => (
              <tr key={t.id} className="hover:bg-surface/40">
                <Td>
                  {t.user ? (
                    <Link href={`/admin/users/${t.user.id}`} className="hover:text-primary transition-colors">
                      <p className="font-medium">{t.user.name ?? '—'}</p>
                      <p className="text-xs text-text-muted">{t.user.email}</p>
                    </Link>
                  ) : <span className="text-text-muted">—</span>}
                </Td>
                <Td><StatusBadge status={t.kind} /></Td>
                <Td className="capitalize text-text-muted">{t.bucket}</Td>
                <Td className={t.amount < 0 ? 'text-rose-600 font-semibold' : 'text-accent font-semibold'}>
                  {t.amount > 0 ? '+' : ''}{t.amount}
                </Td>
                <Td className="text-text-muted max-w-xs truncate">{t.description ?? '—'}</Td>
                <Td className="text-xs text-text-muted">{new Date(t.createdAt).toLocaleDateString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
