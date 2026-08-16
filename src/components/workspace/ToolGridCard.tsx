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
      className="group flex items-start gap-3 p-3.5 rounded-xl border border-border bg-white dark:bg-card hover:border-primary/30 hover:shadow-soft transition-all"
    >
      <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tool.tile)}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-text truncate">{tool.name}</span>
          {!live && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide bg-surface text-text-subtle border border-border-light rounded-full px-1.5 py-0.5">
              Soon
            </span>
          )}
        </span>
        <span className="block text-xs text-text-muted leading-snug line-clamp-2 mt-0.5">{tool.description}</span>
      </span>
      <ArrowUpRight className="w-4 h-4 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0 mt-1" />
    </Link>
  );
}
