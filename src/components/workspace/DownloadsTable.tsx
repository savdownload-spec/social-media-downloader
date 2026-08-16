'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  XCircle,
  CalendarRange,
  DownloadCloud,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { ActivityItem } from '@/lib/workspace/activity';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { resolveDateRangePreset, type DateRangePreset } from '@/lib/export/fields';

type Tab = 'all' | 'completed' | 'failed';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
];

export function DownloadsTable({ items }: { items: ActivityItem[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [preset, setPreset] = useState<DateRangePreset>('last30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { from, to } = useMemo(
    () => (dateFilterOpen ? resolveDateRangePreset(preset, customFrom, customTo) : { from: null, to: null }),
    [dateFilterOpen, preset, customFrom, customTo],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (tab === 'completed' && item.status !== 'success') return false;
      if (tab === 'failed' && item.status === 'success') return false;
      if (q && !item.toolName.toLowerCase().includes(q) && !item.sourceUrl.toLowerCase().includes(q)) return false;
      if (from && item.createdAt < from) return false;
      if (to && item.createdAt > to) return false;
      return true;
    });
  }, [items, tab, query, from, to]);

  async function copyUrl(item: ActivityItem) {
    try {
      await navigator.clipboard.writeText(item.sourceUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((cur) => (cur === item.id ? null : cur)), 1400);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-surface rounded-xl w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors',
              tab === t.id ? 'bg-white dark:bg-card text-text shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + date filter toggle */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by tool or source URL…"
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-white dark:bg-card text-sm text-text placeholder:text-text-subtle outline-none focus:border-primary transition-colors"
          />
        </div>
        <button
          onClick={() => setDateFilterOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border text-sm font-medium transition-colors shrink-0',
            dateFilterOpen
              ? 'border-primary/40 bg-primary-light text-primary'
              : 'border-border bg-white dark:bg-card text-text-muted hover:text-text',
          )}
        >
          <CalendarRange className="w-4 h-4" />
          {dateFilterOpen ? 'Date filter on' : 'Date range'}
        </button>
      </div>

      {dateFilterOpen && (
        <div className="p-3 rounded-xl bg-surface/60 border border-border-light">
          <DateRangePicker
            preset={preset}
            onPresetChange={setPreset}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-14 px-6 rounded-2xl border border-dashed border-border">
          <DownloadCloud className="w-6 h-6 text-text-subtle mx-auto mb-2.5" />
          <p className="text-sm font-medium text-text">No downloads match these filters.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-white dark:bg-card shadow-soft overflow-hidden">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 px-4 py-3.5 border-b border-border-light last:border-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text truncate">{item.toolName}</p>
                  {item.status === 'success' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-text-muted truncate">{item.sourceUrl}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-text-subtle">{formatDate(item.createdAt)}</span>
                <button
                  onClick={() => copyUrl(item)}
                  className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-text-subtle hover:text-text transition-colors"
                  title="Copy source URL"
                >
                  {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                {item.toolHref && (
                  <Link
                    href={item.toolHref}
                    className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-text-subtle hover:text-text transition-colors"
                    title="Open tool"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
