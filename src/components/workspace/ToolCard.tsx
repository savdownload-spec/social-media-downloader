import { groupSlug, isToolAvailable, type CatalogTool } from '@/config/catalog';
import { WorkspaceCard } from './WorkspaceCard';

export function ToolCard({ tool }: { tool: CatalogTool }) {
  const live = isToolAvailable(tool.slug);

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
