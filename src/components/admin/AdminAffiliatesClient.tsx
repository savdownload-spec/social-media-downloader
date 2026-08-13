'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterTab, EmptyState,
} from './AdminUI';
import { useToast } from '@/components/ui/Toast';

const STATUSES = ['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'];

type Affiliate = {
  id: string; userId: string; code: string; commissionRate: number; status: string;
  totalClicks: number; totalSignups: number; totalConversions: number;
  totalRevenue: number; totalCommission: number; paidOut: number; createdAt: string;
};

export function AdminAffiliatesClient() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus]         = useState('ALL');
  const [loading, setLoading]       = useState(true);
  const [actionId, setActionId]     = useState<string | null>(null);
  const { success, error: err }     = useToast();

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (status !== 'ALL') p.set('status', status);
    fetch(`/api/admin/affiliates?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setAffiliates(d.data.affiliates); setTotal(d.data.total); setTotalPages(d.data.totalPages); } })
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [status]);

  async function doAction(id: string, action: 'approve' | 'suspend') {
    setActionId(id);
    const res = await fetch('/api/admin/affiliates', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, id }),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) { success(d.data.message); load(); } else err('Failed', d?.error);
    setActionId(null);
  }

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin" title="Affiliates" description={`${total.toLocaleString()} affiliates`} />

      <div className="flex gap-2 mb-6">
        {STATUSES.map((s) => <FilterTab key={s} label={s === 'ALL' ? 'All' : s} active={status === s} onClick={() => setStatus(s)} />)}
      </div>

      <TableCard>
        <Table>
          <thead>
            <tr>
              <Th>Code</Th><Th>Status</Th><Th>Commission</Th>
              <Th>Clicks</Th><Th>Signups</Th><Th>Conversions</Th>
              <Th>Revenue</Th><Th>Paid Out</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={9}><div className="h-10 mx-4 my-1 rounded-lg bg-surface animate-pulse" /></td></tr>
              ))
            ) : affiliates.length === 0 ? (
              <tr><td colSpan={9}><EmptyState message="No affiliates yet. Affiliate program not active." /></td></tr>
            ) : affiliates.map((a) => (
              <tr key={a.id} className="hover:bg-surface/40">
                <Td className="font-mono text-sm">{a.code}</Td>
                <Td><StatusBadge status={a.status} /></Td>
                <Td className="text-text-muted">{(a.commissionRate * 100).toFixed(0)}%</Td>
                <Td className="text-text-muted">{a.totalClicks}</Td>
                <Td className="text-text-muted">{a.totalSignups}</Td>
                <Td className="text-text-muted">{a.totalConversions}</Td>
                <Td className="text-text-muted">${a.totalRevenue.toFixed(2)}</Td>
                <Td className="text-text-muted">${a.paidOut.toFixed(2)}</Td>
                <Td>
                  <div className="flex gap-2">
                    {a.status !== 'ACTIVE' && (
                      <button disabled={actionId === a.id} onClick={() => doAction(a.id, 'approve')}
                        className="text-xs px-2 py-1 rounded-lg bg-accent-light text-accent hover:bg-accent hover:text-white transition-colors">
                        Approve
                      </button>
                    )}
                    {a.status !== 'SUSPENDED' && (
                      <button disabled={actionId === a.id} onClick={() => doAction(a.id, 'suspend')}
                        className="text-xs px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors">
                        Suspend
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
