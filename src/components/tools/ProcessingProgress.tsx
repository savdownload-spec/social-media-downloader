'use client';

type Props = {
  stage: string;
  percent?: number | null;
  detail?: string;
  className?: string;
};

/** A single operation display. Unknown work stays indeterminate. */
export function ProcessingProgress({ stage, percent, detail, className = '' }: Props) {
  const measured = typeof percent === 'number' && Number.isFinite(percent);
  const value = measured ? Math.max(0, Math.min(100, Math.round(percent))) : null;
  return (
    <div role="status" aria-live="polite" className={`rounded-2xl border border-border bg-white p-4 shadow-soft dark:bg-card sm:p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Processing</p>
        {value !== null && <strong className="text-xl tabular-nums text-primary">{value}%</strong>}
      </div>
      <div role="progressbar" aria-label={stage} aria-valuemin={value === null ? undefined : 0} aria-valuemax={value === null ? undefined : 100} aria-valuenow={value ?? undefined} aria-valuetext={value === null ? `${stage}, progress unavailable` : undefined} className="h-3 overflow-hidden rounded-full bg-primary/10 dark:bg-primary/20">
        <div className={`h-full rounded-full bg-gradient-brand transition-[width] duration-300 ${value === null ? 'w-1/3 animate-pulse' : ''}`} style={value === null ? undefined : { width: `${value}%` }} />
      </div>
      <p className="mt-3 text-sm font-medium text-text">{stage}</p>
      {detail && <p className="mt-1 text-xs text-text-muted">{detail}</p>}
    </div>
  );
}
