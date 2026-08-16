import { notFound } from 'next/navigation';
import { toolsBySlug } from '@/config/tools';
import { getCatalogTool, groupFromSlug } from '@/config/catalog';
import { isFunctionalTool } from '@/config/functionalTools';
import { resolveWorkspaceToolPage } from '@/components/tools/resolveToolPage';
import { buildMetadata } from '@/lib/seo';

// Same reasoning as src/app/tools/[slug]/page.tsx: no meaningful prerendering
// benefit, and this page needs to be dynamic anyway (session-gated by the
// workspace layout above it).
export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: { params: { group: string; slug: string } }) {
  const path = `/workspace/tools/${params.group}/${params.slug}`;
  const tool = toolsBySlug.get(params.slug);
  if (tool) {
    return buildMetadata({ title: tool.name, description: tool.description, path, noIndex: true });
  }
  const entry = getCatalogTool(params.slug);
  if (entry) {
    const title = isFunctionalTool(params.slug) ? entry.name : `${entry.name} (Coming Soon)`;
    return buildMetadata({ title, description: entry.description, path, noIndex: true });
  }
  return {};
}

export default function WorkspaceToolPage({ params }: { params: { group: string; slug: string } }) {
  const group = groupFromSlug(params.group);
  const entry = getCatalogTool(params.slug);
  if (!group || !entry || entry.group !== group) return notFound();

  const page = resolveWorkspaceToolPage(params.slug);
  if (!page) return notFound();
  return page;
}
