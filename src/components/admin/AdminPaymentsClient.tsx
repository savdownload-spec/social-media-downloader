'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterBar, EmptyState,
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

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search) p.set('search', search);
    fetch(`/api/admin/payments?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setPayments(d.data.payments); setTotal(d.data.total); setTotalPages(d.data.totalPages); } })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin" title="Payments" description={`${total.toLocaleString()} payment records`} />
      <FilterBar search={search} onSearch={setSearch} placeholder="Search user or transaction ID…" />

      <TableCard>
        <Table>
          <thead>
            <tr><Th>User</Th><Th>Credits</Th><Th>Description</Th><Th>Status</Th><Th>Transaction ID</Th><Th>Date</Th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6}><div className="h-10 mx-4 my-1 rounded-lg bg-surface animate-pulse" /></td></tr>
              ))
            ) : payments.length === 0 ? (
              <tr><td colSpan={6}><EmptyState message="No payment records yet. Payments appear here after a Stripe purchase." /></td></tr>
            ) : payments.map((p) => (
              <tr key={p.id} className="hover:bg-surface/40">
                <Td>
                  {p.user ? (
                    <Link href={`/admin/users/${p.user.id}`} className="hover:text-primary transition-colors">
                      <p className="font-medium">{p.user.name ?? '—'}</p>
                      <p className="text-xs text-text-muted">{p.user.email}</p>
                    </Link>
                  ) : <span className="text-text-muted">—</span>}
                </Td>
                <Td className="font-semibold text-accent">+{p.amount}</Td>
                <Td className="text-text-muted max-w-xs truncate">{p.description ?? '—'}</Td>
                <Td><StatusBadge status={p.status} /></Td>
                <Td className="text-xs text-text-muted font-mono truncate max-w-[160px]">{p.externalId ?? '—'}</Td>
                <Td className="text-xs text-text-muted">{new Date(p.createdAt).toLocaleDateString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
