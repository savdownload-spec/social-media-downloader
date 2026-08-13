import { notFound } from 'next/navigation';
import { toolsBySlug } from '@/config/tools';
import { getCatalogTool } from '@/config/catalog';
import { getFunctionalTool, isFunctionalTool } from '@/config/functionalTools';
import { ToolPageView } from '@/components/tools/ToolPage';
import { GenericToolPage } from '@/components/tools/GenericToolPage';
import { FunctionalToolLayout } from '@/components/tools/FunctionalToolLayout';
import { buildMetadata } from '@/lib/seo';

// This route used generateStaticParams() + dynamicParams = false to try to
// prerender every tool page at build time, but it only ever returned
// { slug }, never { locale }, back when this route lived under a
// [locale] segment, and no ancestor route defined its own
// generateStaticParams for that segment either. Without a locale to pair
// each slug with, Next.js couldn't actually prerender any of these
// (confirmed: a real `next build` produced zero prerendered tool pages),
// and dynamicParams = false then hard-404d every single one of them in
// production, completely inaccessible despite working fine in `next dev`,
// which bypasses this restriction entirely. Locale routing is gone now,
// but kept force-dynamic rather than reintroducing generateStaticParams,
// the page's real work already happens client-side via /api/download
// anyway, so there's no meaningful caching benefit being given up.
export const dynamic = 'force-dynamic';

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
    // Functional tools are live, no "(Coming Soon)" suffix.
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
