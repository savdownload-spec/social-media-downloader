import type { ReactElement } from 'react';
import { toolsBySlug } from '@/config/tools';
import { getCatalogTool } from '@/config/catalog';
import { getFunctionalTool } from '@/config/functionalTools';
import { ToolPageView } from '@/components/tools/ToolPage';
import { GenericToolPage } from '@/components/tools/GenericToolPage';
import { FunctionalToolLayout } from '@/components/tools/FunctionalToolLayout';
import { WorkspaceToolShell } from '@/components/tools/WorkspaceToolShell';
import { DownloaderForm } from '@/components/tools/DownloaderForm';

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

/**
 * Workspace-native variant: shows the tool's actual functional UI first,
 * wrapped in the compact WorkspaceToolShell (breadcrumb + "Read full guide"
 * link out to the public page), instead of the full marketing page. Reuses
 * exactly the same DownloaderForm / functional-tool components as
 * resolveToolPage — only the surrounding chrome differs.
 */
export function resolveWorkspaceToolPage(slug: string): ReactElement | null {
  const tool = toolsBySlug.get(slug);
  if (tool) {
    const entry = getCatalogTool(slug);
    if (!entry) return null;
    return (
      <WorkspaceToolShell tool={entry}>
        <DownloaderForm
          tool={{
            slug: tool.slug,
            platform: tool.platform,
            name: tool.name,
            placeholder: tool.placeholder,
            urlPattern: tool.urlPattern.source,
          }}
        />
      </WorkspaceToolShell>
    );
  }

  const entry = getCatalogTool(slug);
  if (entry) {
    const functional = getFunctionalTool(slug);
    if (functional) {
      const { Component } = functional;
      return (
        <WorkspaceToolShell tool={entry}>
          <Component slug={slug} />
        </WorkspaceToolShell>
      );
    }
    return <GenericToolPage tool={entry} />;
  }

  return null;
}
