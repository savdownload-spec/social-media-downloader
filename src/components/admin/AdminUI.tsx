'use client';

import { type LucideIcon, AlertTriangle, RefreshCw, Inbox } from 'lucide-react';
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
  purple: { bg: 'bg-primary/[0.08]', icon: 'text-primary' },
  green:  { bg: 'bg-emerald-50',     icon: 'text-emerald-600' },
  blue:   { bg: 'bg-blue-50',        icon: 'text-blue-600' },
  amber:  { bg: 'bg-amber-50',       icon: 'text-amber-600' },
  rose:   { bg: 'bg-rose-50',        icon: 'text-rose-600' },
};

export function StatCard({ label, value, sub, icon: Icon, trend, accent = 'purple' }: StatCardProps) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div className="bg-white border border-border-light rounded-xl p-4 hover:shadow-soft transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', styles.bg)}>
          <Icon className={cn('w-[18px] h-[18px]', styles.icon)} />
        </div>
        {trend && (
          <span className={cn(
            'text-[11px] font-semibold px-2 py-0.5 rounded-full',
            trend.value >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50',
          )}>
            {trend.value >= 0 ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-[11px] font-medium text-text-muted mb-0.5">{label}</p>
      <p className="text-xl font-bold text-text tracking-tight">{value}</p>
      {sub && <p className="text-[11px] text-text-subtle mt-1">{sub}</p>}
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-surface', className)} />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-border-light rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <Skeleton className="w-12 h-5 rounded-full" />
      </div>
      <Skeleton className="w-20 h-3 mb-2" />
      <Skeleton className="w-16 h-6" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-border-light rounded-xl overflow-hidden">
      <div className="border-b border-border-light p-4">
        <Skeleton className="w-40 h-5" />
      </div>
      <div>
        <div className="flex gap-4 px-4 py-3 border-b border-border-light bg-surface/50">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={cn('h-3', i === 0 ? 'w-32' : 'w-20')} />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-border-light/50 last:border-0">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className={cn('h-4', j === 0 ? 'w-36' : 'w-24')} />
            ))}
          </div>
        ))}
      </div>
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
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div>
        {eyebrow && <p className="text-[10px] font-semibold text-primary uppercase tracking-[0.12em] mb-0.5">{eyebrow}</p>}
        <h1 className="text-xl font-bold text-text tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-[13px] text-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ─── Table Shell ─────────────────────────────────────────────────────────────

export function TableCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-border-light rounded-xl overflow-hidden', className)}>
      {children}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">{children}</table>
    </div>
  );
}

export function Th({ children, className, onClick, sortable }: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  sortable?: boolean;
}) {
  return (
    <th
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider bg-surface/60 border-b border-border-light',
        sortable && 'cursor-pointer hover:text-text select-none',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('px-4 py-3 text-[13px] text-text border-b border-border-light/60', className)}>
      {children}
    </td>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, string> = {
  ACTIVE:       'bg-emerald-50 text-emerald-700',
  ADMIN:        'bg-primary/[0.08] text-primary',
  USER:         'bg-surface text-text-muted',
  SUSPENDED:    'bg-rose-50 text-rose-700',
  FREE:         'bg-surface text-text-muted',
  PRO:          'bg-blue-50 text-blue-700',
  MAX:          'bg-primary/[0.08] text-primary',
  LIFETIME:     'bg-amber-50 text-amber-700',
  PENDING:      'bg-amber-50 text-amber-700',
  APPROVED:     'bg-emerald-50 text-emerald-700',
  REJECTED:     'bg-rose-50 text-rose-700',
  active:       'bg-emerald-50 text-emerald-700',
  trialing:     'bg-blue-50 text-blue-700',
  past_due:     'bg-amber-50 text-amber-700',
  canceled:     'bg-rose-50 text-rose-700',
  unpaid:       'bg-rose-50 text-rose-700',
  LIVE:         'bg-emerald-50 text-emerald-700',
  COMING_SOON:  'bg-blue-50 text-blue-700',
  MAINTENANCE:  'bg-amber-50 text-amber-700',
  DISABLED:     'bg-rose-50 text-rose-700',
  succeeded:    'bg-emerald-50 text-emerald-700',
  failed:       'bg-rose-50 text-rose-700',
  purchase:     'bg-blue-50 text-blue-700',
  plan_refill:  'bg-primary/[0.08] text-primary',
  plan_grant:   'bg-primary/[0.08] text-primary',
  spend:        'bg-rose-50 text-rose-700',
  refund:       'bg-amber-50 text-amber-700',
  adjustment:   'bg-surface text-text-muted',
  DRAFT:        'bg-surface text-text-muted',
  PUBLISHED:    'bg-emerald-50 text-emerald-700',
  SCHEDULED:    'bg-blue-50 text-blue-700',
  ARCHIVED:     'bg-amber-50 text-amber-700',
  OPEN:         'bg-blue-50 text-blue-700',
  IN_PROGRESS:  'bg-amber-50 text-amber-700',
  RESOLVED:     'bg-emerald-50 text-emerald-700',
  CLOSED:       'bg-surface text-text-muted',
  WAITING_FOR_REPLY: 'bg-amber-50 text-amber-700',
};

export function StatusBadge({ status, dot }: { status: string; dot?: boolean }) {
  const cls = STATUS_MAP[status] ?? 'bg-surface text-text-muted';
  const label = status.replace(/_/g, ' ');
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold', cls)}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          status === 'ACTIVE' || status === 'active' || status === 'LIVE' || status === 'APPROVED' || status === 'succeeded' || status === 'PUBLISHED' || status === 'RESOLVED'
            ? 'bg-emerald-500'
            : status === 'PENDING' || status === 'MAINTENANCE' || status === 'past_due' || status === 'IN_PROGRESS' || status === 'WAITING_FOR_REPLY' || status === 'SCHEDULED'
            ? 'bg-amber-500'
            : status === 'SUSPENDED' || status === 'REJECTED' || status === 'canceled' || status === 'failed' || status === 'DISABLED'
            ? 'bg-rose-500'
            : 'bg-gray-400',
        )} />
      )}
      {label}
    </span>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, message = 'No data yet.', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-text-subtle" />
      </div>
      {title && <p className="text-sm font-semibold text-text mb-1">{title}</p>}
      <p className="text-[13px] text-text-muted text-center max-w-xs">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong. Please try again.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
        <AlertTriangle className="w-5 h-5 text-rose-500" />
      </div>
      <p className="text-sm font-medium text-text mb-1">Error</p>
      <p className="text-[13px] text-text-muted text-center max-w-xs mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-primary bg-primary/[0.08] rounded-lg hover:bg-primary/[0.12] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-border-light">
      <span className="text-[11px] text-text-muted">{total.toLocaleString()} total</span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-muted border border-border-light hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <span className="text-[12px] text-text-muted px-2">
          {page} of {totalPages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-muted border border-border-light hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
  children?: React.ReactNode;
}

export function FilterBar({ search, onSearch, placeholder = 'Search...', children }: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-5">
      <div className="relative w-full sm:w-72">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 rounded-lg border border-border-light bg-white pl-9 pr-4 text-[13px] text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function FilterTab({
  label, active, onClick, count,
}: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all',
        active
          ? 'bg-text text-white shadow-sm'
          : 'bg-white border border-border-light text-text-muted hover:text-text hover:border-border',
      )}
    >
      {label}
      {count !== undefined && (
        <span className={cn(
          'ml-1.5 text-[10px]',
          active ? 'text-white/70' : 'text-text-subtle',
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Bar Chart (pure CSS) ────────────────────────────────────────────────────

interface BarChartProps {
  data: { label: string; value: number }[];
  title?: string;
  subtitle?: string;
}

export function BarChart({ data, title, subtitle }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bg-white border border-border-light rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          {title && <p className="text-sm font-semibold text-text">{title}</p>}
          {subtitle && <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-36">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <span className="text-[10px] text-text-muted hidden sm:block truncate font-medium">{d.value > 0 ? d.value : ''}</span>
            <div
              className="w-full rounded-t bg-primary/70 transition-all hover:bg-primary"
              style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 4 : 0 }}
            />
            <span className="text-[9px] text-text-subtle truncate w-full text-center">{d.label}</span>
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
    <div className="flex gap-0.5 bg-surface rounded-lg p-0.5 border border-border-light">
      {TIME_FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all',
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
  return <div className="p-5 lg:p-6 max-w-[1400px] mx-auto">{children}</div>;
}

// ─── Action Button ───────────────────────────────────────────────────────────

interface ActionButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

export function ActionButton({
  children, variant = 'secondary', size = 'sm', icon: Icon, onClick, disabled, type = 'button', className,
}: ActionButtonProps) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
    secondary: 'bg-white border border-border-light text-text hover:bg-surface',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    ghost: 'text-text-muted hover:text-text hover:bg-surface',
  };
  const sizes = {
    sm: 'h-8 px-3 text-[12px] gap-1.5',
    md: 'h-9 px-4 text-[13px] gap-2',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {Icon && <Icon className={cn(size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4')} />}
      {children}
    </button>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────

export function SectionCard({ title, subtitle, actions, children, className }: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-white border border-border-light rounded-xl overflow-hidden', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-light">
          <div>
            {title && <h3 className="text-sm font-semibold text-text">{title}</h3>}
            {subtitle && <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
