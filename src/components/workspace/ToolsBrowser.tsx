'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { catalog, toolGroups, type ToolGroup } from '@/config/catalog';
import { ToolCard } from './ToolCard';
import { WorkspaceCardGrid } from './WorkspaceCard';
import { SectionHeader } from './SectionHeader';

interface Props {
  /** Restrict to a single group; omit to browse every group. */
  group?: ToolGroup;
}

export function ToolsBrowser({ group }: Props) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [activeGroup, setActiveGroup] = useState<ToolGroup | 'All'>('All');
  const query = q.trim().toLowerCase();
  const groups = group ? [group] : activeGroup === 'All' ? toolGroups : [activeGroup];

  const anyResults = groups.some((g) =>
    catalog.some(
      (t) =>
        t.group === g &&
        (!query || t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={group ? `Search ${group.toLowerCase()} tools…` : 'Search all tools…'}
            className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-border bg-surface/60 focus:bg-white dark:focus:bg-card outline-none text-sm text-text placeholder:text-text-subtle transition-colors"
          />
        </div>

        {!group && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', ...toolGroups] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setActiveGroup(g)}
                className={cn(
                  'px-3 h-8 rounded-full text-xs font-semibold border transition-colors',
                  activeGroup === g
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-card text-text-muted border-border hover:text-text hover:border-primary/30',
                )}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {!anyResults && (
        <p className="text-sm text-text-muted py-6 text-center">No tools match &ldquo;{q}&rdquo;.</p>
      )}

      {groups.map((g) => {
        const items = catalog.filter(
          (t) =>
            t.group === g &&
            (!query || t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)),
        );
        if (items.length === 0) return null;
        return (
          <div key={g}>
            {!group && activeGroup === 'All' && <SectionHeader title={g} />}
            <WorkspaceCardGrid>
              {items.map((t) => (
                <ToolCard key={t.slug} tool={t} />
              ))}
            </WorkspaceCardGrid>
          </div>
        );
      })}
    </div>
  );
}
