import { cn } from '@/lib/utils';

/** Full-width wrapper for tables/lists (Downloads, Activity, transaction ledgers, etc.). */
export function DataSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('w-full rounded-2xl border border-border bg-white dark:bg-card shadow-soft overflow-hidden', className)}>
      {children}
    </div>
  );
}
