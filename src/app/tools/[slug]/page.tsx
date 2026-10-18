import { notFound } from 'next/navigation';
import { toolsBySlug } from '@/config/tools';
import { getCatalogTool } from '@/config/catalog';
import { isFunctionalTool } from '@/config/functionalTools';
import { resolveToolPage } from '@/components/tools/resolveToolPage';
import { buildMetadata } from '@/lib/seo';
import { prisma } from '@/lib/prisma';

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

const STATUS_BADGE: Record<string, string> = {
  COMING_SOON: '(Coming Soon)',
  MAINTENANCE: '(Maintenance)',
  DISABLED: '(Unavailable)',
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  // Read persisted status so metadata reflects the tool's real state.
  const config = await prisma.toolConfig.findUnique({
    where: { slug: params.slug },
    select: { status: true },
  }).catch(() => null);
  const status = config?.status ?? 'LIVE';

  const tool = toolsBySlug.get(params.slug);
  if (tool) {
    const badge = STATUS_BADGE[status];
    const title = badge ? `${tool.name} ${badge}` : tool.name;
    return buildMetadata({
      title,
      description: tool.description,
      path: `/tools/${tool.slug}`,
      keywords: tool.keywords,
    });
  }
  const entry = getCatalogTool(params.slug);
  if (entry) {
    // For catalog entries: use persisted status badge when available;
    // fall back to the legacy "(Coming Soon)" only for non-functional tools
    // when there is no DB row (status === 'LIVE' because of the null fallback).
    let title: string;
    if (STATUS_BADGE[status]) {
      title = `${entry.name} ${STATUS_BADGE[status]}`;
    } else if (!isFunctionalTool(params.slug)) {
      title = `${entry.name} (Coming Soon)`;
    } else {
      title = entry.name;
    }
    return buildMetadata({
      title,
      description: entry.description,
      path: `/tools/${entry.slug}`,
      keywords: entry.keywords,
    });
  }
  return {};
}

export default async function Page({ params }: { params: { slug: string } }) {
  // Read persisted Admin status from DB; treat missing row as LIVE (fail-safe).
  const config = await prisma.toolConfig.findUnique({
    where: { slug: params.slug },
    select: { status: true },
  }).catch(() => null);
  const status = config?.status ?? 'LIVE';

  const page = resolveToolPage(params.slug, status);
  if (!page) return notFound();
  return page;
}
