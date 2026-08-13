'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  EmptyState, TimeFilter,
} from './AdminUI';
import { Download } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'usage',         label: 'Tool Usage' },
  { id: 'users',         label: 'User Growth' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'credits',       label: 'Credit Usage' },
];

export function AdminReportsClient() {
  const [type, setType]       = useState('usage');
  const [days, setDays]       = useState('30');
  const [rows, setRows]       = useState<Record<string, unknown>[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/reports?type=${type}&days=${days}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setRows(d.data.rows); setTotal(d.data.total); } })
      .finally(() => setLoading(false));
  }, [type, days]);

  useEffect(() => { load(); }, [load]);

  function exportCSV() {
    window.open(`/api/admin/reports?type=${type}&days=${days}&format=csv`, '_blank');
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin"
        title="Reports"
        description="Export and analyse platform data"
        actions={
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-border hover:border-primary/40 text-text-muted hover:text-primary transition-all shadow-soft"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 flex-wrap">
          {REPORT_TYPES.map((r) => (
            <button key={r.id} onClick={() => setType(r.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                type === r.id ? 'bg-primary text-white shadow-sm' : 'bg-white border border-border text-text-muted hover:text-text'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto"><TimeFilter value={days} onChange={setDays} /></div>
      </div>

      <p className="text-sm text-text-muted mb-4">{total.toLocaleString()} records in the last {days} days</p>

      <TableCard>
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 rounded-lg bg-surface animate-pulse" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState message="No data for this period." />
        ) : (
          <Table>
            <thead>
              <tr>{columns.map((c) => <Th key={c}>{c}</Th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((row, i) => (
                <tr key={i} className="hover:bg-surface/40">
                  {columns.map((c) => (
                    <Td key={c} className="text-xs font-mono max-w-[200px] truncate">
                      {String(row[c] ?? '—')}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableCard>
      {rows.length > 100 && (
        <p className="text-xs text-text-muted mt-3 text-center">Showing first 100 rows. Export CSV for all {total} records.</p>
      )}
    </AdminPage>
  );
}
