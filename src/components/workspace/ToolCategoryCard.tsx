import type { LucideIcon } from 'lucide-react';
import { catalog, groupBlurb, groupSlug, type ToolGroup } from '@/config/catalog';
import { WorkspaceCard } from './WorkspaceCard';

interface Props {
  group: ToolGroup;
  icon: LucideIcon;
  tile: string;
}

export function ToolCategoryCard({ group, icon, tile }: Props) {
  const count = catalog.filter((t) => t.group === group).length;

  return (
    <WorkspaceCard
      href={`/workspace/tools/${groupSlug(group)}`}
      icon={icon}
      tile={tile}
      title={group}
      description={groupBlurb[group]}
      meta={`${count} ${count === 1 ? 'tool' : 'tools'}`}
    />
  );
}
