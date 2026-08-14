'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, CheckCircle, XCircle, Wrench } from 'lucide-react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td, SectionCard,
  StatusBadge, Pagination, FilterBar, EmptyState, ErrorState,
  BarChart, TimeFilter, StatCard, Skeleton,
} from './AdminUI';

type Row = { id: string; tool: string; platform: string; status: string; createdAt: string };

export function AdminUsageClient() {
  const [data, setData] = useState<{
    downloads: Row[]; total: number; page: number; totalPages: number;
    byTool: { tool: string; count: number }[];
    byStatus: { status: string; count: number }[];
    byDay: { label: string; value: number }[];
  } | null>(null);
  const [days, setDays]       = useState('30');
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const p = new URLSearchParams({ days, page: String(page), pageSize: '25' });
    if (search) p.set('search', search);
    fetch(`/api/admin/usage?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d.data); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [days, page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [days, search]);

  const successCount = data?.byStatus.find((s) => s.status === 'success')?.count ?? 0;
  const failedCount  = data?.byStatus.reduce((sum, s) => s.status !== 'success' ? sum + s.count : sum, 0) ?? 0;

  if (error) return <AdminPage><PageHeader title="Usage Analytics" /><ErrorState message="Failed to load usage data." onRetry={load} /></AdminPage>;

  return (
    <AdminPage>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-6">
        <PageHeader title="Usage Analytics" description={`${(data?.total ?? 0).toLocaleString()} processing jobs`} />
        <div className="sm:ml-auto shrink-0"><TimeFilter value={days} onChange={setDays} /></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Jobs" value={(data?.total ?? 0).toLocaleString()} icon={Activity} accent="purple" />
        <StatCard label="Successful" value={successCount.toLocaleString()} icon={CheckCircle} accent="green" />
        <StatCard label="Failed" value={failedCount.toLocaleString()} icon={XCircle} accent="rose" />
        <StatCard label="Top Tool" value={data?.byTool[0]?.tool ?? '—'} icon={Wrench} accent="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <BarChart data={data?.byDay ?? []} title="Daily Jobs" subtitle={`Last ${days} days`} />
        <SectionCard title="Top Tools">
          {!data?.byTool.length ? <EmptyState message="No tool usage data." /> : (
            <div className="divide-y divide-border-light">
              {data.byTool.map((r, i) => (
                <div key={r.tool} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="text-[11px] text-text-subtle font-medium w-5">{i + 1}</span>
                  <span className="text-[13px] text-text font-medium truncate flex-1">{r.tool}</span>
                  <span className="text-[13px] text-text-muted tabular-nums">{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Search tool or platform..." />

      <TableCard>
        <Table>
          <thead>
            <tr><Th>Tool</Th><Th>Platform</Th><Th>Status</Th><Th className="text-right">Date</Th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : !data?.downloads.length ? (
              <tr><td colSpan={4}><EmptyState icon={Activity} title="No activity" message="No processing activity in this period." /></td></tr>
            ) : data.downloads.map((d) => (
              <tr key={d.id} className="hover:bg-surface/40 transition-colors">
                <Td className="font-medium">{d.tool}</Td>
                <Td className="text-text-muted">{d.platform}</Td>
                <Td><StatusBadge status={d.status} dot /></Td>
                <Td className="text-right text-[12px] text-text-muted whitespace-nowrap tabular-nums">{new Date(d.createdAt).toLocaleString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
