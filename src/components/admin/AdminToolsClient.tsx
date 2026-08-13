'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  StatusBadge, FilterBar, EmptyState,
} from './AdminUI';
import { useToast } from '@/components/ui/Toast';

type Tool = {
  slug: string; name: string; category: string; status: string;
  creditCost: number; freeLimit: number; usageTotal: number; updatedAt: string;
};

const STATUSES = ['LIVE', 'COMING_SOON', 'MAINTENANCE', 'DISABLED'];

export function AdminToolsClient() {
  const [tools, setTools]     = useState<Tool[]>([]);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState<string | null>(null);
  const { success, error: err } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/tools')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setTools(d.data.tools); })
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
    if (d?.ok) { success('Status updated'); setTools((prev) => prev.map((t) => t.slug === slug ? { ...t, status } : t)); }
    else err('Failed', d?.error);
    setSaving(null);
  }

  const filtered = tools.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminPage>
      <PageHeader eyebrow="Admin" title="Tools" description={`${tools.length} tools`} />
      <FilterBar search={search} onSearch={setSearch} placeholder="Search tools…" />

      <TableCard>
        <Table>
          <thead>
            <tr>
              <Th>Tool</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th>Total Uses</Th>
              <Th>Credit Cost</Th>
              <Th>Free Limit</Th>
              <Th>Updated</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="h-10 mx-4 my-1 rounded-lg bg-surface animate-pulse" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7}><EmptyState message="No tools found." /></td></tr>
            ) : filtered.map((t) => (
              <tr key={t.slug} className="hover:bg-surface/40 transition-colors">
                <Td>
                  <div>
                    <p className="font-medium text-text">{t.name}</p>
                    <p className="text-xs text-text-muted">{t.slug}</p>
                  </div>
                </Td>
                <Td className="text-text-muted">{t.category}</Td>
                <Td>
                  <select
                    value={t.status}
                    disabled={saving === t.slug}
                    onChange={(e) => updateStatus(t.slug, e.target.value)}
                    className="text-xs border border-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-primary/50 cursor-pointer"
                  >
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Td>
                <Td className="text-text-muted font-medium">{t.usageTotal.toLocaleString()}</Td>
                <Td className="text-text-muted">{t.creditCost === 0 ? 'Free' : t.creditCost}</Td>
                <Td className="text-text-muted">{t.freeLimit === 0 ? 'Unlimited' : t.freeLimit}</Td>
                <Td className="text-xs text-text-muted">{new Date(t.updatedAt).toLocaleDateString()}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableCard>
    </AdminPage>
  );
}
