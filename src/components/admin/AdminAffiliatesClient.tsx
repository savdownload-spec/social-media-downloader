'use client';

import { useState, useEffect, useCallback } from 'react';
import { Share2 } from 'lucide-react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterTab, EmptyState, ErrorState, Skeleton,
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
  const [error, setError]           = useState(false);
  const [actionId, setActionId]     = useState<string | null>(null);
  const { success, error: err }     = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (status !== 'ALL') p.set('status', status);
    fetch(`/api/admin/affiliates?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setAffiliates(d.data.affiliates); setTotal(d.data.total); setTotalPages(d.data.totalPages); } else setError(true); })
      .catch(() => setError(true))
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

  if (error) return <AdminPage><PageHeader title="Affiliates" /><ErrorState message="Failed to load affiliate data." onRetry={load} /></AdminPage>;

  return (
    <AdminPage>
      <PageHeader title="Affiliates" description={`${total.toLocaleString()} affiliates`} />

      <div className="flex flex-wrap gap-2 mb-5">
        {STATUSES.map((s) => (
          <FilterTab
            key={s}
            label={s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            active={status === s}
            onClick={() => setStatus(s)}
          />
        ))}
      </div>

      <TableCard>
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Status</Th>
              <Th className="text-right">Commission</Th>
              <Th className="text-right">Clicks</Th>
              <Th className="text-right">Signups</Th>
              <Th className="text-right">Conversions</Th>
              <Th className="text-right">Revenue</Th>
              <Th className="text-right">Paid Out</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={9} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : affiliates.length === 0 ? (
              <tr><td colSpan={9}>
                <EmptyState
                  icon={Share2}
                  title="No affiliates"
                  message="Affiliate partners will appear here when they join the program."
                />
              </td></tr>
            ) : affiliates.map((a) => (
              <tr key={a.id} className="hover:bg-surface/40 transition-colors">
                <Td>
                  <span className="font-mono text-[12px] font-medium bg-surface px-2 py-0.5 rounded">{a.code}</span>
                </Td>
                <Td><StatusBadge status={a.status} dot /></Td>
                <Td className="text-right text-text-muted tabular-nums">{(a.commissionRate * 100).toFixed(0)}%</Td>
                <Td className="text-right text-text-muted tabular-nums">{a.totalClicks.toLocaleString()}</Td>
                <Td className="text-right text-text-muted tabular-nums">{a.totalSignups.toLocaleString()}</Td>
                <Td className="text-right text-text-muted tabular-nums">{a.totalConversions.toLocaleString()}</Td>
                <Td className="text-right text-text-muted tabular-nums">${a.totalRevenue.toFixed(2)}</Td>
                <Td className="text-right text-text-muted tabular-nums">${a.paidOut.toFixed(2)}</Td>
                <Td>
                  <div className="flex gap-1.5 justify-end">
                    {a.status !== 'ACTIVE' && (
                      <button
                        disabled={actionId === a.id}
                        onClick={() => doAction(a.id, 'approve')}
                        className="text-[11px] font-medium px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                    )}
                    {a.status !== 'SUSPENDED' && (
                      <button
                        disabled={actionId === a.id}
                        onClick={() => doAction(a.id, 'suspend')}
                        className="text-[11px] font-medium px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
                      >
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
