import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tile: string;
  /** A real, current metric (e.g. item count) — omit for a "Soon" badge instead. */
  count?: number;
  soon?: boolean;
}

export function WorkspaceSectionCard({ title, description, href, icon: Icon, tile, count, soon }: Props) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 p-5 rounded-2xl border border-border bg-white dark:bg-card hover:border-primary/30 hover:shadow-soft-md transition-all"
    >
      <div className="flex items-start justify-between">
        <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tile}`}>
          <Icon className="w-5 h-5" />
        </span>
        {soon ? (
          <span className="text-[9px] font-bold uppercase tracking-wide bg-surface text-text-subtle border border-border-light rounded-full px-2 py-1">
            Soon
          </span>
        ) : (
          <ArrowRight className="w-4 h-4 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        )}
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-text">{title}</h3>
        <p className="mt-1 text-sm text-text-muted leading-snug">{description}</p>
      </div>
      {typeof count === 'number' && (
        <p className="mt-auto text-xs font-semibold text-text-subtle">
          {count} {count === 1 ? 'item' : 'items'}
        </p>
      )}
    </Link>
  );
}
