import type { ReactElement } from 'react';
import { toolsBySlug } from '@/config/tools';
import { getCatalogTool } from '@/config/catalog';
import { getFunctionalTool } from '@/config/functionalTools';
import { ToolPageView } from '@/components/tools/ToolPage';
import { GenericToolPage } from '@/components/tools/GenericToolPage';
import { FunctionalToolLayout } from '@/components/tools/FunctionalToolLayout';

/**
 * Shared dispatch: downloader config -> live downloader UI, catalog entry
 * with a registered functional component -> live functional UI, catalog
 * entry only -> "Coming soon" page, otherwise null (caller should 404).
 * Used by both the public /tools/[slug] route and the in-workspace
 * /workspace/tools/[group]/[slug] route so the two never drift apart.
 */
export function resolveToolPage(slug: string): ReactElement | null {
  const tool = toolsBySlug.get(slug);
  if (tool) return <ToolPageView tool={tool} />;

  const entry = getCatalogTool(slug);
  if (entry) {
    const functional = getFunctionalTool(slug);
    if (functional) {
      const { Component } = functional;
      return (
        <FunctionalToolLayout tool={entry}>
          <Component slug={slug} />
        </FunctionalToolLayout>
      );
    }
    return <GenericToolPage tool={entry} />;
  }

  return null;
}
