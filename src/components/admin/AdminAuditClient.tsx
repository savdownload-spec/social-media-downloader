'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  Pagination, FilterBar, EmptyState,
} from './AdminUI';

type Log = {
  id: string; adminEmail: string; action: string;
  targetType: string | null; targetId: string | null;
  detail: unknown; ip: string | null; createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  'user.suspend':    'text-rose-600 bg-rose-50',
  'user.restore':    'text-accent bg-accent-light',
  'user.delete':     'text-rose-700 bg-rose-100',
  'user.changePlan': 'text-blue-700 bg-blue-50',
  'credit.add':      'text-accent bg-accent-light',
  'credit.remove':   'text-amber-700 bg-amber-50',
  'review.approve':  'text-accent bg-accent-light',
  'review.reject':   'text-rose-600 bg-rose-50',
  'pricing.update':  'text-primary bg-primary-light',
  'settings.update': 'text-blue-700 bg-blue-50',
  'content.create':  'text-accent bg-accent-light',
  'content.update':  'text-blue-700 bg-blue-50',
  'content.delete':  'text-rose-600 bg-rose-50',
  'tool.update':     'text-primary bg-primary-light',
};

export function AdminAuditClient() {
  const [logs, setLogs]         = useState<Log[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), pageSize: '25' });
    if (search) p.set('search', search);
    fetch(`/api/admin/audit?${p}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setLogs(d.data.logs); setTotal(d.data.total); setTotalPages(d.data.totalPages); } })
      .finally(() => setLoading(false));
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search]);

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin" title="Audit Log" description={`${total.toLocaleString()} events recorded`} />
      <FilterBar search={search} onSearch={setSearch} placeholder="Search action, admin, or target ID…" />

      <TableCard>
        <Table>
          <thead>
            <tr><Th>Admin</Th><Th>Action</Th><Th>Target</Th><Th>IP</Th><Th>Date</Th><Th>Detail</Th></tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={6}><div className="h-10 mx-4 my-1 rounded-lg bg-surface animate-pulse" /></td></tr>)
            ) : logs.length === 0 ? (
              <tr><td colSpan={6}><EmptyState message="No audit events yet. Admin actions will appear here." /></td></tr>
            ) : logs.map((l) => (
              <>
                <tr key={l.id} className="hover:bg-surface/40 cursor-pointer" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                  <Td className="text-text-muted text-xs">{l.adminEmail}</Td>
                  <Td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold font-mono ${ACTION_COLORS[l.action] ?? 'bg-surface text-text-muted'}`}>
                      {l.action}
                    </span>
                  </Td>
                  <Td className="text-text-muted text-xs">
                    {l.targetType && <span className="font-semibold text-text">{l.targetType}</span>}
                    {l.targetId && <> <span className="font-mono">{l.targetId.slice(0, 12)}…</span></>}
                    {!l.targetType && '—'}
                  </Td>
                  <Td className="text-text-muted text-xs font-mono">{l.ip ?? '—'}</Td>
                  <Td className="text-xs text-text-muted whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</Td>
                  <Td className="text-xs text-primary">{l.detail ? (expanded === l.id ? '▲ hide' : '▼ show') : '—'}</Td>
                </tr>
                {expanded === l.id && l.detail && (
                  <tr key={`${l.id}-detail`} className="bg-surface">
                    <td colSpan={6} className="px-6 py-3">
                      <pre className="text-xs text-text-muted font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(l.detail, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
      </TableCard>
    </AdminPage>
  );
}
