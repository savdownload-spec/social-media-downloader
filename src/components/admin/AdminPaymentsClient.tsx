'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DollarSign } from 'lucide-react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterBar, EmptyState, ErrorState, Skeleton,
} from './AdminUI';

type Payment = {
  id: string; externalId: string | null; amount: number;
  description: string | null; status: string; createdAt: string;
  user: { id: string; name: string | null; email: string | null } | null;
};

export function AdminPaymentsClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search) p.set('search', search);
    fetch(`/api/admin/payments?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setPayments(d.data.payments); setTotal(d.data.total); setTotalPages(d.data.totalPages); } else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  if (error) return <AdminPage><PageHeader title="Payments" /><ErrorState message="Failed to load payment data." onRetry={load} /></AdminPage>;

  return (
    <AdminPage>
      <PageHeader title="Payments" description={`${total.toLocaleString()} payment records`} />
      <FilterBar search={search} onSearch={setSearch} placeholder="Search user or transaction ID..." />

      <TableCard>
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th className="text-right">Credits</Th>
              <Th>Description</Th>
              <Th>Status</Th>
              <Th>Transaction ID</Th>
              <Th className="text-right">Date</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : payments.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState
                  icon={DollarSign}
                  title="No payments yet"
                  message="Payment records will appear here after Stripe purchases."
                />
              </td></tr>
            ) : payments.map((p) => (
              <tr key={p.id} className="hover:bg-surface/40 transition-colors">
                <Td>
                  {p.user ? (
                    <Link href={`/admin/users/${p.user.id}`} className="hover:text-primary transition-colors">
                      <p className="font-medium text-text">{p.user.name ?? '—'}</p>
                      <p className="text-[11px] text-text-muted">{p.user.email}</p>
                    </Link>
                  ) : <span className="text-text-muted">—</span>}
                </Td>
                <Td className="text-right">
                  <span className="font-semibold text-emerald-600 tabular-nums">+{p.amount}</span>
                </Td>
                <Td className="text-text-muted max-w-[200px] truncate text-[12px]">{p.description ?? '—'}</Td>
                <Td><StatusBadge status={p.status} dot /></Td>
                <Td>
                  <span className="text-[11px] text-text-muted font-mono truncate block max-w-[140px]">{p.externalId ?? '—'}</span>
                </Td>
                <Td className="text-right text-[12px] text-text-muted whitespace-nowrap tabular-nums">{new Date(p.createdAt).toLocaleDateString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
