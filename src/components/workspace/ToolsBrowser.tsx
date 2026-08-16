'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { catalog, toolGroups, type ToolGroup } from '@/config/catalog';
import { ToolGridCard } from './ToolGridCard';

interface Props {
  /** Restrict to a single group; omit to browse every group. */
  group?: ToolGroup;
}

export function ToolsBrowser({ group }: Props) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const query = q.trim().toLowerCase();
  const groups = group ? [group] : toolGroups;

  const anyResults = groups.some((g) =>
    catalog.some(
      (t) =>
        t.group === g &&
        (!query || t.name.toLowerCase().includes(query) || t.description.toLowerCase().includes(query)),
    ),
  );

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={group ? `Search ${group.toLowerCase()} tools…` : 'Search all tools…'}
          className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-border bg-surface/60 focus:bg-white dark:focus:bg-card outline-none text-sm text-text placeholder:text-text-subtle transition-colors"
        />
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
            {!group && (
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-subtle mb-2.5">{g}</h2>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {items.map((t) => (
                <ToolGridCard key={t.slug} tool={t} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
