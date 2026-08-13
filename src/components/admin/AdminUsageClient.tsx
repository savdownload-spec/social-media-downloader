'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, Pagination, FilterBar, EmptyState, BarChart, TimeFilter,
} from './AdminUI';

type Row = { id: string; tool: string; platform: string; status: string; createdAt: string };

export function AdminUsageClient() {
  const [data, setData]       = useState<{
    downloads: Row[]; total: number; page: number; totalPages: number;
    byTool: { tool: string; count: number }[];
    byStatus: { status: string; count: number }[];
    byDay: { label: string; value: number }[];
  } | null>(null);
  const [days, setDays]       = useState('30');
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ days, page: String(page), pageSize: '25' });
    if (search) p.set('search', search);
    fetch(`/api/admin/usage?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d.data); })
      .finally(() => setLoading(false));
  }, [days, page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [days, search]);

  const successCount = data?.byStatus.find((s) => s.status === 'success')?.count ?? 0;
  const failedCount  = data?.byStatus.find((s) => s.status !== 'success')?.count ?? 0;

  return (
    <AdminPage>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <PageHeader eyebrow="Admin" title="Usage Analytics" description={`${(data?.total ?? 0).toLocaleString()} processing jobs`} />
        <div className="sm:ml-auto"><TimeFilter value={days} onChange={setDays} /></div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Jobs',    value: data?.total ?? 0 },
          { label: 'Successful',   value: successCount },
          { label: 'Failed',       value: failedCount },
          { label: 'Top Tool',     value: data?.byTool[0]?.tool ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-border rounded-2xl p-4 shadow-soft">
            <p className="text-xs text-text-muted mb-1">{label}</p>
            <p className="text-xl font-bold text-text">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <BarChart data={data?.byDay ?? []} title="Daily jobs (last 14 days)" />
        <TableCard>
          <div className="p-4 border-b border-border"><p className="text-sm font-semibold text-text">Top tools</p></div>
          {!data?.byTool.length ? <EmptyState /> : (
            <div className="divide-y divide-border">
              {data.byTool.map((r) => (
                <div key={r.tool} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-text font-medium truncate">{r.tool}</span>
                  <span className="text-text-muted">{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </TableCard>
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Search tool or platform…" />

      <TableCard>
        <Table>
          <thead>
            <tr><Th>Tool</Th><Th>Platform</Th><Th>Status</Th><Th>Date</Th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={4}><div className="h-10 mx-4 my-1 rounded-lg bg-surface animate-pulse" /></td></tr>
              ))
            ) : !data?.downloads.length ? (
              <tr><td colSpan={4}><EmptyState message="No activity in this period." /></td></tr>
            ) : data.downloads.map((d) => (
              <tr key={d.id} className="hover:bg-surface/40">
                <Td className="font-medium">{d.tool}</Td>
                <Td className="text-text-muted">{d.platform}</Td>
                <Td><StatusBadge status={d.status} /></Td>
                <Td className="text-xs text-text-muted">{new Date(d.createdAt).toLocaleString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
