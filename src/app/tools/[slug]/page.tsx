import { notFound } from 'next/navigation';
import { tools, toolsBySlug } from '@/config/tools';
import { ToolPageView } from '@/components/tools/ToolPage';
import { buildMetadata } from '@/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const tool = toolsBySlug.get(params.slug);
  if (!tool) return {};
  return buildMetadata({
    title: tool.name,
    description: tool.description,
    path: `/tools/${tool.slug}`,
    keywords: tool.keywords,
  });
}

export default function Page({ params }: { params: { slug: string } }) {
  const tool = toolsBySlug.get(params.slug);
  if (!tool) return notFound();
  return <ToolPageView tool={tool} />;
}
