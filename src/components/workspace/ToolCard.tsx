import { groupSlug, type CatalogTool } from '@/config/catalog';
import { WorkspaceCard } from './WorkspaceCard';
import { isToolLive } from '@/lib/toolStatuses';

interface Props {
  tool: CatalogTool;
  toolStatuses: Map<string, string>;
}

export function ToolCard({ tool, toolStatuses }: Props) {
  const live = isToolLive(tool.slug, toolStatuses);

  return (
    <WorkspaceCard
      href={`/workspace/tools/${groupSlug(tool.group)}/${tool.slug}`}
      icon={tool.icon}
      tile={tool.tile}
      title={tool.name}
      description={tool.description}
      meta={tool.group}
      badge={live ? undefined : 'soon'}
    />
  );
}
