'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  Pagination, FilterBar, EmptyState, ErrorState, Skeleton,
} from './AdminUI';

type Log = {
  id: string; adminEmail: string; action: string;
  targetType: string | null; targetId: string | null;
  detail: unknown; ip: string | null; createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  'user.suspend':    'text-rose-700 bg-rose-50',
  'user.restore':    'text-emerald-700 bg-emerald-50',
  'user.delete':     'text-rose-700 bg-rose-50',
  'user.changePlan': 'text-blue-700 bg-blue-50',
  'user.changeRole': 'text-primary bg-primary/[0.08]',
  'credit.add':      'text-emerald-700 bg-emerald-50',
  'credit.remove':   'text-amber-700 bg-amber-50',
  'review.approve':  'text-emerald-700 bg-emerald-50',
  'review.reject':   'text-rose-700 bg-rose-50',
  'review.delete':   'text-rose-700 bg-rose-50',
  'review.edit':     'text-blue-700 bg-blue-50',
  'pricing.update':  'text-primary bg-primary/[0.08]',
  'settings.update': 'text-blue-700 bg-blue-50',
  'content.create':  'text-emerald-700 bg-emerald-50',
  'content.update':  'text-blue-700 bg-blue-50',
  'content.delete':  'text-rose-700 bg-rose-50',
  'tool.update':     'text-primary bg-primary/[0.08]',
};

export function AdminAuditClient() {
  const [logs, setLogs]         = useState<Log[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search) p.set('search', search);
    fetch(`/api/admin/audit?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setLogs(d.data.logs); setTotal(d.data.total); setTotalPages(d.data.totalPages); } else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  if (error) return <AdminPage><PageHeader title="Audit Log" /><ErrorState message="Failed to load audit log." onRetry={load} /></AdminPage>;

  return (
    <AdminPage>
      <PageHeader title="Audit Log" description={`${total.toLocaleString()} events recorded`} />
      <FilterBar search={search} onSearch={setSearch} placeholder="Search action, admin, or target..." />

      <TableCard>
        <Table>
          <thead>
            <tr>
              <Th>Admin</Th>
              <Th>Action</Th>
              <Th>Target</Th>
              <Th>IP</Th>
              <Th className="text-right">Date</Th>
              <Th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={6}>
                <EmptyState
                  icon={ClipboardList}
                  title="No audit events"
                  message="Admin actions will be logged here automatically."
                />
              </td></tr>
            ) : logs.map((l) => (
              <Fragment key={l.id}>
                <tr className="hover:bg-surface/40 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                  <Td className="text-[12px] text-text-muted">{l.adminEmail}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold font-mono ${ACTION_COLORS[l.action] ?? 'bg-surface text-text-muted'}`}>
                      {l.action}
                    </span>
                  </Td>
                  <Td className="text-[12px] text-text-muted">
                    {l.targetType && <span className="font-medium text-text">{l.targetType}</span>}
                    {l.targetId && <span className="font-mono text-text-subtle ml-1">{l.targetId.length > 12 ? l.targetId.slice(0, 12) + '...' : l.targetId}</span>}
                    {!l.targetType && '—'}
                  </Td>
                  <Td className="text-[11px] text-text-subtle font-mono">{l.ip ?? '—'}</Td>
                  <Td className="text-right text-[12px] text-text-muted whitespace-nowrap tabular-nums">{new Date(l.createdAt).toLocaleString()}</Td>
                  <Td className="text-center">
                    {l.detail ? (
                      expanded === l.id
                        ? <ChevronUp className="w-3.5 h-3.5 text-text-subtle inline" />
                        : <ChevronDown className="w-3.5 h-3.5 text-text-subtle inline" />
                    ) : null}
                  </Td>
                </tr>
                {expanded === l.id && l.detail ? (
                  <tr className="bg-surface/60">
                    <td colSpan={6} className="px-6 py-3">
                      <pre className="text-[11px] text-text-muted font-mono whitespace-pre-wrap break-all leading-relaxed">
                        {JSON.stringify(l.detail, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
