import { notFound } from 'next/navigation';
import { toolsBySlug } from '@/config/tools';
import { catalog, getCatalogTool } from '@/config/catalog';
import { ToolPageView } from '@/components/tools/ToolPage';
import { GenericToolPage } from '@/components/tools/GenericToolPage';
import { buildMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  // Union of catalog slugs and any functional tools not surfaced in the catalog.
  const slugs = new Set<string>(catalog.map((t) => t.slug));
  for (const slug of toolsBySlug.keys()) slugs.add(slug);
  return Array.from(slugs, (slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const tool = toolsBySlug.get(params.slug);
  if (tool) {
    return buildMetadata({
      title: tool.name,
      description: tool.description,
      path: `/tools/${tool.slug}`,
      keywords: tool.keywords,
    });
  }
  const entry = getCatalogTool(params.slug);
  if (entry) {
    return buildMetadata({
      title: `${entry.name} (Coming Soon)`,
      description: entry.description,
      path: `/tools/${entry.slug}`,
    });
  }
  return {};
}

export default function Page({ params }: { params: { slug: string } }) {
  const tool = toolsBySlug.get(params.slug);
  if (tool) return <ToolPageView tool={tool} />;

  const entry = getCatalogTool(params.slug);
  if (entry) return <GenericToolPage tool={entry} />;

  return notFound();
}
