'use client';

import { motion } from 'framer-motion';

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
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted">Processing</p>
      <div role="progressbar" aria-label={stage} aria-valuemin={value === null ? undefined : 0} aria-valuemax={value === null ? undefined : 100} aria-valuenow={value ?? undefined} aria-valuetext={value === null ? `${stage}, percentage unavailable` : undefined} className="relative h-8 overflow-hidden rounded-full bg-primary/10 dark:bg-primary/20">
        {value === null
          ? <motion.div aria-hidden className="h-full w-1/4 rounded-full bg-gradient-brand opacity-70" animate={{ x: ['-100%', '400%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
          : <div className="h-full rounded-full bg-gradient-brand transition-[width] duration-500" style={{ width: `${value}%` }} />}
        <span className="absolute inset-0 flex items-center justify-center"><strong className="rounded-full bg-white/85 px-2 text-sm tabular-nums text-text dark:bg-card/85">{value === null ? '—%  ·  Processing' : `${value}%`}</strong></span>
      </div>
      <p className="mt-3 text-sm font-medium text-text">{stage}</p>
      {detail && <p className="mt-1 text-xs text-text-muted">{detail}</p>}
    </div>
  );
}
