'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, CheckCircle, Clock3, XCircle, Wrench } from 'lucide-react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td, SectionCard,
  StatusBadge, Pagination, FilterBar, EmptyState, ErrorState,
  BarChart, TimeFilter, StatCard, Skeleton,
} from './AdminUI';

type Row = {
  id: string;
  tool: string;
  platform: string;
  status: string;
  failureCode: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
};

export function AdminUsageClient() {
  const [data, setData] = useState<{
    downloads: Row[]; total: number; page: number; totalPages: number;
    byTool: { tool: string; count: number }[];
    byStatus: { status: string; count: number }[];
    byDay: { label: string; value: number }[];
    filters: { tools: string[]; platforms: string[]; statuses: string[] };
  } | null>(null);
  const [days, setDays]       = useState('30');
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [tool, setTool]       = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const p = new URLSearchParams({ days, page: String(page), pageSize: '25' });
    if (search) p.set('search', search);
    if (tool) p.set('tool', tool);
    if (platform) p.set('platform', platform);
    if (status) p.set('status', status);
    fetch(`/api/admin/usage?${p}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setData(d.data); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [days, page, search, tool, platform, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [days, search, tool, platform, status]);

  const successCount = data?.byStatus.find((s) => s.status === 'success')?.count ?? 0;
  const failedCount  = data?.byStatus.find((s) => s.status === 'failed')?.count ?? 0;
  const inProgressCount = data?.byStatus.reduce(
    (sum, item) => ['pending', 'processing'].includes(item.status) ? sum + item.count : sum,
    0,
  ) ?? 0;

  if (error) return <AdminPage><PageHeader title="Usage Analytics" /><ErrorState message="Failed to load usage data." onRetry={load} /></AdminPage>;

  return (
    <AdminPage>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-6">
        <PageHeader title="Usage Analytics" description={`${(data?.total ?? 0).toLocaleString()} processing jobs`} />
        <div className="sm:ml-auto shrink-0"><TimeFilter value={days} onChange={setDays} /></div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Jobs" value={(data?.total ?? 0).toLocaleString()} icon={Activity} accent="purple" />
        <StatCard label="Successful" value={successCount.toLocaleString()} icon={CheckCircle} accent="green" />
        <StatCard label="Failed" value={failedCount.toLocaleString()} icon={XCircle} accent="rose" />
        <StatCard label="In Progress" value={inProgressCount.toLocaleString()} icon={Clock3} accent="amber" />
        <StatCard label="Top Tool" value={data?.byTool[0]?.tool ?? '—'} icon={Wrench} accent="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <BarChart data={data?.byDay ?? []} title="Daily Jobs" subtitle={`Last ${days} UTC day${days === '1' ? '' : 's'}`} />
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

      <FilterBar search={search} onSearch={setSearch} placeholder="Search tool or platform...">
        <select value={tool} onChange={(event) => setTool(event.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-text dark:bg-card" aria-label="Filter by tool"><option value="">All tools</option>{data?.filters.tools.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-text dark:bg-card" aria-label="Filter by platform"><option value="">All platforms</option>{data?.filters.platforms.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-border bg-white px-3 py-2 text-xs text-text dark:bg-card" aria-label="Filter by status"><option value="">All statuses</option>{data?.filters.statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
      </FilterBar>

      <TableCard>
        <Table>
          <thead>
            <tr><Th>Tool</Th><Th>Platform</Th><Th>Status</Th><Th>Details</Th><Th className="text-right">Date</Th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : !data?.downloads.length ? (
              <tr><td colSpan={5}><EmptyState icon={Activity} title="No Activity" message="No processing activity in this period." /></td></tr>
            ) : data.downloads.map((d) => (
              <tr key={d.id} className="hover:bg-surface/40 transition-colors">
                <Td className="font-medium">{d.tool}</Td>
                <Td className="text-text-muted">{d.platform}</Td>
                <Td><StatusBadge status={d.status} dot /></Td>
                <Td className="max-w-[260px] text-[11px] text-text-muted">
                  {d.failureCode ? (
                    <span title={d.failureReason ?? d.failureCode}>
                      <span className="font-mono text-text">{d.failureCode}</span>
                      {d.failureReason ? ` · ${d.failureReason}` : ''}
                    </span>
                  ) : '—'}
                </Td>
                <Td className="text-right text-[12px] text-text-muted whitespace-nowrap tabular-nums">{new Date(d.createdAt).toLocaleString('en', { timeZone: 'UTC' })} UTC</Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination page={data?.page ?? 1} totalPages={data?.totalPages ?? 1} total={data?.total ?? 0} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
