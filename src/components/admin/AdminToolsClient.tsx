'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  AdminPage, PageHeader, TableCard, Table, Th, Td,
  FilterBar, FilterTab, EmptyState, ErrorState, Skeleton,
} from './AdminUI';
import { useToast } from '@/components/ui/Toast';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { getToolBatchLimits, MULTI_FILE_TOOL_SLUGS } from '@/lib/batchLimits';
import { cn } from '@/lib/utils';

type Tool = {
  slug: string;
  name: string;
  category: string;
  status: string;
  creditCost: number;
  freeLimit: number;
  usageTotal: number;
  updatedAt: string;
  // Batch limit overrides — null means "use the code default".
  batchLimitFree:     number | null;
  batchLimitPro:      number | null;
  batchLimitMax:      number | null;
  batchLimitLifetime: number | null;
};

const STATUS_FILTERS = ['ALL', 'LIVE', 'COMING_SOON', 'MAINTENANCE', 'DISABLED'];
const STATUSES = ['LIVE', 'COMING_SOON', 'MAINTENANCE', 'DISABLED'];

/** Returns whether this tool has multi-file batch support (i.e. batch limits apply). */
function isMultiFileTool(slug: string): boolean {
  return (MULTI_FILE_TOOL_SLUGS as readonly string[]).includes(slug);
}

/** Small editable number input for batch limit cells. */
function BatchLimitInput({
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="flex flex-col gap-0.5 min-w-[80px]">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-text-subtle">{label}</span>
      <input
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-lg border border-border-light bg-white px-2 py-1.5 text-[12px] tabular-nums text-text',
          'placeholder:text-text-subtle',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      />
    </label>
  );
}

export function AdminToolsClient() {
  const [tools, setTools]               = useState<Tool[]>([]);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(false);
  const [saving, setSaving]             = useState<string | null>(null);
  // Which tool's batch-limit row is expanded.
  const [expanded, setExpanded]         = useState<string | null>(null);
  // Pending edits for the expanded tool's batch limits.
  const [batchEdits, setBatchEdits]     = useState<Record<string, string>>({});
  const { success, error: err }         = useToast();

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
    else err('Failed to update status', d?.error);
    setSaving(null);
  }

  function openBatchEditor(tool: Tool) {
    if (expanded === tool.slug) { setExpanded(null); return; }
    // Pre-populate with current DB values (empty string = use code default).
    const defaults = getToolBatchLimits(tool.slug, null);
    setBatchEdits({
      batchLimitFree:     tool.batchLimitFree     != null ? String(tool.batchLimitFree)     : String(defaults.free),
      batchLimitPro:      tool.batchLimitPro      != null ? String(tool.batchLimitPro)      : String(defaults.pro),
      batchLimitMax:      tool.batchLimitMax      != null ? String(tool.batchLimitMax)      : String(defaults.max),
      batchLimitLifetime: tool.batchLimitLifetime != null ? String(tool.batchLimitLifetime) : String(defaults.lifetime),
    });
    setExpanded(tool.slug);
  }

  async function saveBatchLimits(slug: string) {
    setSaving(slug);
    const codeDefaults = getToolBatchLimits(slug, null);
    const parseField = (key: keyof typeof codeDefaults, raw: string): number | null => {
      const n = parseInt(raw, 10);
      if (!Number.isFinite(n) || n < 1) return null;
      // Store null when the value matches the code default — keeps admin intent clean.
      return n === (codeDefaults[key] as number) ? null : n;
    };

    const payload = {
      batchLimitFree:     parseField('free',     batchEdits.batchLimitFree     ?? ''),
      batchLimitPro:      parseField('pro',      batchEdits.batchLimitPro      ?? ''),
      batchLimitMax:      parseField('max',      batchEdits.batchLimitMax      ?? ''),
      batchLimitLifetime: parseField('lifetime', batchEdits.batchLimitLifetime ?? ''),
    };

    const res = await fetch(`/api/admin/tools/${slug}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) {
      success('Batch limits saved');
      setTools((prev) => prev.map((t) => t.slug === slug ? { ...t, ...payload, updatedAt: d.data?.updatedAt ?? t.updatedAt } : t));
      setExpanded(null);
    } else {
      err('Failed to save batch limits', d?.error);
    }
    setSaving(null);
  }

  function resetBatchLimits(slug: string) {
    const defaults = getToolBatchLimits(slug, null);
    setBatchEdits({
      batchLimitFree:     String(defaults.free),
      batchLimitPro:      String(defaults.pro),
      batchLimitMax:      String(defaults.max),
      batchLimitLifetime: String(defaults.lifetime),
    });
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

  const COL_COUNT = 7;

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
                <Th className="text-right">Batch Limits</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={COL_COUNT} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={COL_COUNT}>
                  <EmptyState
                    icon={Wrench}
                    title="No tools found"
                    message={search ? 'Try adjusting your search.' : 'Tool configurations will appear here.'}
                  />
                </td></tr>
              ) : filtered.map((t) => {
                const isMulti = isMultiFileTool(t.slug);
                const isExpanded = expanded === t.slug;
                const codeDefaults = getToolBatchLimits(t.slug, null);

                // Resolved display values (DB override if set, else code default).
                const displayFree     = t.batchLimitFree     ?? codeDefaults.free;
                const displayPro      = t.batchLimitPro      ?? codeDefaults.pro;
                const displayLifetime = t.batchLimitLifetime ?? codeDefaults.lifetime;
                const hasOverride = t.batchLimitFree != null || t.batchLimitPro != null || t.batchLimitMax != null || t.batchLimitLifetime != null;

                return (
                  <Fragment key={t.slug}>
                    <tr className="hover:bg-surface/40 transition-colors">
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
                          className="text-[11px] font-medium border border-border-light rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 cursor-pointer transition-all dark:bg-card"
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
                      <Td className="text-right">
                        {isMulti ? (
                          <button
                            type="button"
                            onClick={() => openBatchEditor(t)}
                            className={cn(
                              'inline-flex items-center gap-1 text-[12px] tabular-nums font-medium rounded-lg px-2 py-1',
                              'transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
                              isExpanded
                                ? 'bg-primary-light text-primary'
                                : hasOverride
                                  ? 'text-primary hover:bg-primary-light'
                                  : 'text-text-muted hover:bg-surface',
                            )}
                            aria-expanded={isExpanded}
                            aria-label={`Edit batch limits for ${t.name}`}
                            title="Edit per-plan batch limits"
                          >
                            <span className="hidden sm:inline">
                              {displayFree}F / {displayPro}P / {displayLifetime}L
                            </span>
                            <span className="sm:hidden">{displayFree}F</span>
                            {isExpanded
                              ? <ChevronDown className="h-3 w-3" aria-hidden />
                              : <ChevronRight className="h-3 w-3" aria-hidden />}
                          </button>
                        ) : (
                          <span className="text-[12px] text-text-subtle">N/A</span>
                        )}
                      </Td>
                      <Td className="text-[12px] text-text-muted whitespace-nowrap">{new Date(t.updatedAt).toLocaleDateString()}</Td>
                    </tr>

                    {/* Expandable batch-limit editor row */}
                    {isMulti && isExpanded && (
                      <tr key={`${t.slug}-batch`} className="bg-primary-light/30 dark:bg-primary/5">
                        <td colSpan={COL_COUNT} className="px-4 py-4 border-b border-border-light">
                          <div className="space-y-3">
                            <p className="text-[12px] font-semibold text-text">
                              Batch limits for <span className="text-primary">{t.name}</span>
                              <span className="ml-2 font-normal text-text-muted">
                                — number of files per batch. Leave blank to use the code default.
                              </span>
                            </p>

                            <div className="flex flex-wrap gap-3 items-end">
                              <BatchLimitInput
                                label="Free"
                                placeholder={String(codeDefaults.free)}
                                value={batchEdits.batchLimitFree ?? ''}
                                onChange={(v) => setBatchEdits((prev) => ({ ...prev, batchLimitFree: v }))}
                                disabled={saving === t.slug}
                              />
                              <BatchLimitInput
                                label="Pro"
                                placeholder={String(codeDefaults.pro)}
                                value={batchEdits.batchLimitPro ?? ''}
                                onChange={(v) => setBatchEdits((prev) => ({ ...prev, batchLimitPro: v }))}
                                disabled={saving === t.slug}
                              />
                              <BatchLimitInput
                                label="Max"
                                placeholder={String(codeDefaults.max)}
                                value={batchEdits.batchLimitMax ?? ''}
                                onChange={(v) => setBatchEdits((prev) => ({ ...prev, batchLimitMax: v }))}
                                disabled={saving === t.slug}
                              />
                              <BatchLimitInput
                                label="Lifetime"
                                placeholder={String(codeDefaults.lifetime)}
                                value={batchEdits.batchLimitLifetime ?? ''}
                                onChange={(v) => setBatchEdits((prev) => ({ ...prev, batchLimitLifetime: v }))}
                                disabled={saving === t.slug}
                              />

                              {/* Action buttons */}
                              <div className="flex gap-2 items-end pb-0.5">
                                <button
                                  type="button"
                                  disabled={saving === t.slug}
                                  onClick={() => saveBatchLimits(t.slug)}
                                  className={cn(
                                    'rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white',
                                    'bg-primary hover:bg-primary-hover active:scale-[0.98] transition-all',
                                    'focus:outline-none focus:ring-2 focus:ring-primary/30',
                                    'disabled:opacity-50 disabled:cursor-not-allowed',
                                  )}
                                >
                                  {saving === t.slug ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  disabled={saving === t.slug}
                                  onClick={() => resetBatchLimits(t.slug)}
                                  className={cn(
                                    'rounded-lg px-3 py-1.5 text-[12px] font-medium text-text-muted',
                                    'border border-border-light bg-white hover:bg-surface active:scale-[0.98] transition-all',
                                    'focus:outline-none focus:ring-2 focus:ring-primary/20',
                                    'disabled:opacity-50 disabled:cursor-not-allowed',
                                  )}
                                >
                                  Reset to defaults
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setExpanded(null)}
                                  className={cn(
                                    'rounded-lg px-3 py-1.5 text-[12px] font-medium text-text-muted',
                                    'hover:text-text transition-colors',
                                    'focus:outline-none focus:ring-2 focus:ring-primary/20',
                                  )}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>

                            {/* Current effective values */}
                            <p className="text-[11px] text-text-subtle">
                              Currently effective: Free&nbsp;{displayFree} · Pro&nbsp;{displayPro} · Max&nbsp;{t.batchLimitMax ?? codeDefaults.max} · Lifetime&nbsp;{displayLifetime}
                              {hasOverride && <span className="ml-2 text-primary font-medium">· custom overrides active</span>}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        </TableCard>
      )}
    </AdminPage>
  );
}
