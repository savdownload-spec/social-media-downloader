import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { catalog, groupBlurb, groupSlug, type ToolGroup } from '@/config/catalog';
import type { LucideIcon } from 'lucide-react';

interface Props {
  group: ToolGroup;
  icon: LucideIcon;
  tile: string;
}

export function ToolCategoryCard({ group, icon: Icon, tile }: Props) {
  const count = catalog.filter((t) => t.group === group).length;

  return (
    <Link
      href={`/workspace/tools/${groupSlug(group)}`}
      className="group flex flex-col gap-3 p-5 rounded-2xl border border-border bg-white dark:bg-card hover:border-primary/30 hover:shadow-soft-md transition-all"
    >
      <div className="flex items-start justify-between">
        <span className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tile}`}>
          <Icon className="w-5 h-5" />
        </span>
        <ArrowRight className="w-4 h-4 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-text">{group}</h3>
        <p className="mt-1 text-sm text-text-muted leading-snug">{groupBlurb[group]}</p>
      </div>
      <p className="mt-auto text-xs font-semibold text-text-subtle">
        {count} {count === 1 ? 'tool' : 'tools'}
      </p>
    </Link>
  );
}
