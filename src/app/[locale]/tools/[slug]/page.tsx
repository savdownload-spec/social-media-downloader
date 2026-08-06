import { notFound } from 'next/navigation';
import { toolsBySlug } from '@/config/tools';
import { catalog, getCatalogTool } from '@/config/catalog';
import { getFunctionalTool, isFunctionalTool } from '@/config/functionalTools';
import { ToolPageView } from '@/components/tools/ToolPage';
import { GenericToolPage } from '@/components/tools/GenericToolPage';
import { FunctionalToolLayout } from '@/components/tools/FunctionalToolLayout';
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
    // Functional tools are live — no "(Coming Soon)" suffix.
    const title = isFunctionalTool(params.slug) ? entry.name : `${entry.name} (Coming Soon)`;
    return buildMetadata({
      title,
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
  if (entry) {
    // Functional tools (image / PDF / QR / utility) render a live UI.
    const functional = getFunctionalTool(params.slug);
    if (functional) {
      const { Component } = functional;
      return (
        <FunctionalToolLayout tool={entry}>
          <Component slug={params.slug} />
        </FunctionalToolLayout>
      );
    }
    return <GenericToolPage tool={entry} />;
  }

  return notFound();
}
