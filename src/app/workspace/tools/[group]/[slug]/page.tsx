import { notFound } from 'next/navigation';
import { toolsBySlug } from '@/config/tools';
import { getCatalogTool, groupFromSlug } from '@/config/catalog';
import { isFunctionalTool } from '@/config/functionalTools';
import { resolveWorkspaceToolPage } from '@/components/tools/resolveToolPage';
import { buildMetadata } from '@/lib/seo';
import { prisma } from '@/lib/prisma';

// Same reasoning as src/app/tools/[slug]/page.tsx: no meaningful prerendering
// benefit, and this page needs to be dynamic anyway (session-gated by the
// workspace layout above it).
export const dynamic = 'force-dynamic';

const STATUS_BADGE: Record<string, string> = {
  COMING_SOON: '(Coming Soon)',
  MAINTENANCE: '(Maintenance)',
  DISABLED: '(Unavailable)',
};

export async function generateMetadata({ params }: { params: { group: string; slug: string } }) {
  const path = `/workspace/tools/${params.group}/${params.slug}`;

  // Read persisted status so metadata reflects the tool's real state.
  const config = await prisma.toolConfig.findUnique({
    where: { slug: params.slug },
    select: { status: true },
  }).catch(() => null);
  const status = config?.status ?? 'LIVE';
  const badge = STATUS_BADGE[status];

  const tool = toolsBySlug.get(params.slug);
  if (tool) {
    const title = badge ? `${tool.name} ${badge}` : tool.name;
    return buildMetadata({ title, description: tool.description, path, noIndex: true });
  }
  const entry = getCatalogTool(params.slug);
  if (entry) {
    let title: string;
    if (badge) {
      title = `${entry.name} ${badge}`;
    } else if (!isFunctionalTool(params.slug)) {
      title = `${entry.name} (Coming Soon)`;
    } else {
      title = entry.name;
    }
    return buildMetadata({ title, description: entry.description, path, noIndex: true });
  }
  return {};
}

export default async function WorkspaceToolPage({ params }: { params: { group: string; slug: string } }) {
  const group = groupFromSlug(params.group);
  const entry = getCatalogTool(params.slug);
  if (!group || !entry || entry.group !== group) return notFound();

  // Read persisted Admin status from DB; treat missing row as LIVE (fail-safe).
  const config = await prisma.toolConfig.findUnique({
    where: { slug: params.slug },
    select: { status: true },
  }).catch(() => null);
  const status = config?.status ?? 'LIVE';

  const page = resolveWorkspaceToolPage(params.slug, status);
  if (!page) return notFound();
  return page;
}
