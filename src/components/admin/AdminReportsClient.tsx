'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, Flag, BarChart3 } from 'lucide-react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  EmptyState, ErrorState, TimeFilter, FilterTab, Skeleton, ActionButton,
} from './AdminUI';

const REPORT_TYPES = [
  { id: 'usage',         label: 'Tool Usage',    icon: BarChart3 },
  { id: 'users',         label: 'User Growth',   icon: BarChart3 },
  { id: 'subscriptions', label: 'Subscriptions', icon: BarChart3 },
  { id: 'credits',       label: 'Credit Usage',  icon: BarChart3 },
];

export function AdminReportsClient() {
  const [type, setType]       = useState('usage');
  const [days, setDays]       = useState('30');
  const [rows, setRows]       = useState<Record<string, unknown>[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/admin/reports?type=${type}&days=${days}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) { setRows(d.data.rows); setTotal(d.data.total); } else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [type, days]);

  useEffect(() => { load(); }, [load]);

  function exportCSV() {
    window.open(`/api/admin/reports?type=${type}&days=${days}&format=csv`, '_blank');
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const currentReport = REPORT_TYPES.find((r) => r.id === type);

  return (
    <AdminPage>
      <PageHeader
        title="Reports"
        description="Generate and export platform analytics"
        actions={
          <ActionButton variant="secondary" icon={Download} onClick={exportCSV}>
            Export CSV
          </ActionButton>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          {REPORT_TYPES.map((r) => (
            <FilterTab key={r.id} label={r.label} active={type === r.id} onClick={() => setType(r.id)} />
          ))}
        </div>
        <div className="sm:ml-auto"><TimeFilter value={days} onChange={setDays} /></div>
      </div>

      <p className="text-[12px] text-text-muted mb-4">{total.toLocaleString()} records in the last {days} days</p>

      {error ? (
        <ErrorState message="Failed to generate report." onRetry={load} />
      ) : (
        <TableCard>
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Flag}
              title="No data"
              message={`No ${currentReport?.label.toLowerCase() ?? 'report'} data for this period.`}
            />
          ) : (
            <>
              <Table>
                <thead>
                  <tr>{columns.map((c) => <Th key={c}>{c.replace(/_/g, ' ')}</Th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((row, i) => (
                    <tr key={i} className="hover:bg-surface/40 transition-colors">
                      {columns.map((c) => (
                        <Td key={c} className="text-[12px] font-mono max-w-[200px] truncate text-text-muted">
                          {String(row[c] ?? '—')}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
              {rows.length > 100 && (
                <div className="px-4 py-3 border-t border-border-light">
                  <p className="text-[11px] text-text-muted text-center">
                    Showing first 100 rows. Export CSV for all {total.toLocaleString()} records.
                  </p>
                </div>
              )}
            </>
          )}
        </TableCard>
      )}
    </AdminPage>
  );
}
