import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { groupSlug, isToolAvailable, type CatalogTool } from '@/config/catalog';
import { cn } from '@/lib/utils';

export function ToolGridCard({ tool }: { tool: CatalogTool }) {
  const Icon = tool.icon;
  const live = isToolAvailable(tool.slug);

  return (
    <Link
      href={`/workspace/tools/${groupSlug(tool.group)}/${tool.slug}`}
      className="group flex flex-col gap-3 p-5 rounded-2xl border border-border bg-white dark:bg-card hover:border-primary/30 hover:shadow-soft-md transition-all"
    >
      <div className="flex items-start justify-between">
        <span className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', tool.tile)}>
          <Icon className="w-5 h-5" />
        </span>
        {live ? (
          <ArrowUpRight className="w-4 h-4 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        ) : (
          <span className="text-[9px] font-bold uppercase tracking-wide bg-surface text-text-subtle border border-border-light rounded-full px-2 py-1">
            Soon
          </span>
        )}
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-text">{tool.name}</h3>
        <p className="mt-1 text-sm text-text-muted leading-snug line-clamp-2">{tool.description}</p>
      </div>
      <p className="mt-auto text-xs font-semibold text-text-subtle">{tool.group}</p>
    </Link>
  );
}
