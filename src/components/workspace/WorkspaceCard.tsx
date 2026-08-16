import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';

interface WorkspaceCardProps {
  href: string;
  icon: ComponentType<{ className?: string }>;
  tile: string;
  title: string;
  description: string;
  /** Small footer line — a category label, a count ("20 tools"), etc. */
  meta?: string;
  badge?: 'soon';
  external?: boolean;
}

/**
 * The one card shape used everywhere in the Workspace (tool category
 * summaries, workspace sections, tool listings). Sized to sit 4-per-row on
 * desktop, 2-per-row on tablet, 1-per-row on mobile — always the same
 * width/height/padding, never stretched to fill a partial row. Use inside
 * <WorkspaceCardGrid>.
 */
export function WorkspaceCard({ href, icon: Icon, tile, title, description, meta, badge, external }: WorkspaceCardProps) {
  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group flex flex-col gap-3 p-5 rounded-2xl border border-border bg-white dark:bg-card hover:border-primary/30 hover:shadow-soft-md transition-all w-full sm:w-[calc(50%-0.5rem)] xl:w-[calc(25%-0.75rem)]"
    >
      <div className="flex items-start justify-between">
        <span className={cn('w-11 h-11 rounded-2xl flex items-center justify-center shrink-0', tile)}>
          <Icon className="w-5 h-5" />
        </span>
        {badge === 'soon' ? (
          <span className="text-[9px] font-bold uppercase tracking-wide bg-surface text-text-subtle border border-border-light rounded-full px-2 py-1">
            Soon
          </span>
        ) : (
          <ArrowRight className="w-4 h-4 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        )}
      </div>
      <div className="flex-1">
        <h3 className="text-[15px] font-bold text-text">{title}</h3>
        <p className="mt-1 text-sm text-text-muted leading-snug line-clamp-2">{description}</p>
      </div>
      {meta && <p className="text-xs font-semibold text-text-subtle">{meta}</p>}
    </Link>
  );
}

/**
 * Flex-wrap grid, not CSS grid: a partial last row (e.g. 3 cards after a
 * full row of 4) stays centered at the same fixed card width instead of
 * being stretched to fill the row.
 */
export function WorkspaceCardGrid({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-4">{children}</div>;
}
