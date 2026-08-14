'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, FilterBar, FilterTab, EmptyState, ErrorState, Skeleton,
} from './AdminUI';
import { useToast } from '@/components/ui/Toast';
import { Wrench } from 'lucide-react';

type Tool = {
  slug: string; name: string; category: string; status: string;
  creditCost: number; freeLimit: number; usageTotal: number; updatedAt: string;
};

const STATUS_FILTERS = ['ALL', 'LIVE', 'COMING_SOON', 'MAINTENANCE', 'DISABLED'];
const STATUSES = ['LIVE', 'COMING_SOON', 'MAINTENANCE', 'DISABLED'];

export function AdminToolsClient() {
  const [tools, setTools]           = useState<Tool[]>([]);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [saving, setSaving]         = useState<string | null>(null);
  const { success, error: err }     = useToast();

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch('/api/admin/tools')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setTools(d.data.tools); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(slug: string, status: string) {
    setSaving(slug);
    const res = await fetch(`/api/admin/tools/${slug}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) { success('Tool status updated'); setTools((prev) => prev.map((t) => t.slug === slug ? { ...t, status } : t)); }
    else err('Failed to update', d?.error);
    setSaving(null);
  }

  const filtered = tools.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    ALL: tools.length,
    LIVE: tools.filter((t) => t.status === 'LIVE').length,
    COMING_SOON: tools.filter((t) => t.status === 'COMING_SOON').length,
    MAINTENANCE: tools.filter((t) => t.status === 'MAINTENANCE').length,
    DISABLED: tools.filter((t) => t.status === 'DISABLED').length,
  };

  return (
    <AdminPage>
      <PageHeader title="Tools" description={`${tools.length} tools configured`} />

      <FilterBar search={search} onSearch={setSearch} placeholder="Search tools...">
        {STATUS_FILTERS.map((f) => (
          <FilterTab
            key={f}
            label={f === 'ALL' ? 'All' : f.replace('_', ' ')}
            active={statusFilter === f}
            onClick={() => setStatusFilter(f)}
            count={statusCounts[f as keyof typeof statusCounts]}
          />
        ))}
      </FilterBar>

      {error ? (
        <ErrorState message="Failed to load tools." onRetry={load} />
      ) : (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <Th>Tool</Th>
                <Th>Category</Th>
                <Th>Status</Th>
                <Th className="text-right">Total Uses</Th>
                <Th className="text-right">Credit Cost</Th>
                <Th className="text-right">Free Limit</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <EmptyState
                    icon={Wrench}
                    title="No tools found"
                    message={search ? 'Try adjusting your search.' : 'Tool configurations will appear here.'}
                  />
                </td></tr>
              ) : filtered.map((t) => (
                <tr key={t.slug} className="hover:bg-surface/40 transition-colors">
                  <Td>
                    <div className="min-w-0">
                      <p className="font-medium text-text">{t.name}</p>
                      <p className="text-[11px] text-text-muted truncate">{t.slug}</p>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-[12px] text-text-muted bg-surface px-2 py-0.5 rounded-md">{t.category}</span>
                  </Td>
                  <Td>
                    <select
                      value={t.status}
                      disabled={saving === t.slug}
                      onChange={(e) => updateStatus(t.slug, e.target.value)}
                      className="text-[11px] font-medium border border-border-light rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer transition-all"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </Td>
                  <Td className="text-right text-text-muted tabular-nums font-medium">{t.usageTotal.toLocaleString()}</Td>
                  <Td className="text-right">
                    <span className={t.creditCost === 0 ? 'text-emerald-600 text-[12px] font-medium' : 'text-text-muted'}>
                      {t.creditCost === 0 ? 'Free' : t.creditCost}
                    </span>
                  </Td>
                  <Td className="text-right text-text-muted tabular-nums">
                    {t.freeLimit === 0 ? <span className="text-[12px] text-text-subtle">Unlimited</span> : t.freeLimit}
                  </Td>
                  <Td className="text-[12px] text-text-muted whitespace-nowrap">{new Date(t.updatedAt).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableCard>
      )}
    </AdminPage>
  );
}
