'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  accent?: 'purple' | 'green' | 'blue' | 'amber' | 'rose';
}

const ACCENT_STYLES = {
  purple: { bg: 'bg-primary-light', icon: 'text-primary' },
  green:  { bg: 'bg-accent-light',  icon: 'text-accent' },
  blue:   { bg: 'bg-blue-50',       icon: 'text-blue-600' },
  amber:  { bg: 'bg-amber-50',      icon: 'text-amber-600' },
  rose:   { bg: 'bg-rose-50',       icon: 'text-rose-600' },
};

export function StatCard({ label, value, sub, icon: Icon, trend, accent = 'purple' }: StatCardProps) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', styles.bg)}>
          <Icon className={cn('w-4 h-4', styles.icon)} />
        </div>
        {trend && (
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full',
            trend.value >= 0 ? 'text-accent bg-accent-light' : 'text-rose-600 bg-rose-50',
          )}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-2xl font-bold text-text tracking-tight">{value}</p>
      {sub && <p className="text-xs text-text-subtle mt-1">{sub}</p>}
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        {eyebrow && <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-bold text-text tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ─── Table Shell ─────────────────────────────────────────────────────────────

export function TableCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-border rounded-2xl shadow-soft overflow-hidden', className)}>
      {children}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide bg-surface border-b border-border', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-4 py-3.5 text-sm text-text border-b border-border/50 last:border-0', className)}>
      {children}
    </td>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  // User statuses
  ACTIVE:       'bg-accent-light text-accent',
  ADMIN:        'bg-primary-light text-primary',
  USER:         'bg-surface text-text-muted',
  SUSPENDED:    'bg-rose-50 text-rose-700',
  // Plan
  FREE:         'bg-surface text-text-muted',
  PRO:          'bg-blue-50 text-blue-700',
  MAX:          'bg-primary-light text-primary',
  LIFETIME:     'bg-amber-50 text-amber-700',
  // Review
  PENDING:      'bg-amber-50 text-amber-700',
  APPROVED:     'bg-accent-light text-accent',
  REJECTED:     'bg-rose-50 text-rose-700',
  // Subscription
  active:       'bg-accent-light text-accent',
  trialing:     'bg-blue-50 text-blue-700',
  past_due:     'bg-amber-50 text-amber-700',
  canceled:     'bg-rose-50 text-rose-700',
  unpaid:       'bg-rose-50 text-rose-700',
  // Tool
  LIVE:         'bg-accent-light text-accent',
  COMING_SOON:  'bg-blue-50 text-blue-700',
  MAINTENANCE:  'bg-amber-50 text-amber-700',
  DISABLED:     'bg-rose-50 text-rose-700',
  // Payment
  succeeded:    'bg-accent-light text-accent',
  failed:       'bg-rose-50 text-rose-700',
  // Credit kinds
  purchase:     'bg-blue-50 text-blue-700',
  plan_refill:  'bg-primary-light text-primary',
  spend:        'bg-rose-50 text-rose-700',
  refund:       'bg-amber-50 text-amber-700',
  adjustment:   'bg-surface text-text-muted',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_MAP[status] ?? 'bg-surface text-text-muted';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', cls)}>
      {status.replace('_', ' ')}
    </span>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

export function EmptyState({ message = 'No data yet.' }: { message?: string }) {
  return (
    <div className="py-16 text-center text-text-muted text-sm">{message}</div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, totalPages, total, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <span className="text-xs text-text-muted">{total} total</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted bg-surface hover:bg-surface/70 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-xs text-text-muted">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted bg-surface hover:bg-surface/70 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ─── Search + Filter bar ─────────────────────────────────────────────────────

interface FilterBarProps {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  children?: React.ReactNode; // filter dropdowns / tabs
}

export function FilterBar({ search, onSearch, placeholder = 'Search…', children }: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-xl border border-border bg-white px-4 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-primary/50 transition-colors w-full sm:w-72"
      />
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function FilterTab({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
        active ? 'bg-primary text-white shadow-sm' : 'bg-white border border-border text-text-muted hover:text-text',
      )}
    >
      {label}
    </button>
  );
}

// ─── Bar Chart (pure CSS) ─────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number }[];
  title?: string;
}

export function BarChart({ data, title }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
      {title && <p className="text-sm font-semibold text-text mb-4">{title}</p>}
      <div className="flex items-end gap-2 h-32">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-xs text-text-muted hidden sm:block truncate">{d.value > 0 ? d.value : ''}</span>
            <div
              className="w-full rounded-t-md bg-primary/80 transition-all hover:bg-primary"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
            />
            <span className="text-[10px] text-text-subtle truncate w-full text-center">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Time Filter ─────────────────────────────────────────────────────────────

const TIME_FILTERS = [
  { label: 'Today',  value: '1'  },
  { label: '7d',     value: '7'  },
  { label: '30d',    value: '30' },
  { label: '90d',    value: '90' },
  { label: '1y',     value: '365' },
];

export function TimeFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 bg-surface rounded-xl p-1 border border-border">
      {TIME_FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            'px-3 py-1 rounded-lg text-xs font-semibold transition-all',
            value === f.value ? 'bg-white text-text shadow-sm' : 'text-text-muted hover:text-text',
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

export function AdminPage({ children }: { children: React.ReactNode }) {
  return <div className="p-6 max-w-screen-xl mx-auto">{children}</div>;
}
