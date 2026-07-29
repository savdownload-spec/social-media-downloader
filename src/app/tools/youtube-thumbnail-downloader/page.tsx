import { notFound } from 'next/navigation';
import { toolsBySlug } from '@/config/tools';
import { ToolPageView } from '@/components/tools/ToolPage';
import { buildMetadata } from '@/lib/seo';

const SLUG = 'youtube-thumbnail-downloader';

export function generateMetadata() {
  const tool = toolsBySlug.get(SLUG);
  if (!tool) return {};
  return buildMetadata({
    title: tool.name,
    description: tool.description,
    path: `/tools/${tool.slug}`,
    keywords: tool.keywords,
  });
}

export default function Page() {
  const tool = toolsBySlug.get(SLUG);
  if (!tool) return notFound();
  return <ToolPageView tool={tool} />;
}
