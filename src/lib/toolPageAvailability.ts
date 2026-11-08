import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { isToolAvailable } from '@/config/catalog';

export const getToolPageStatuses = cache(async (): Promise<Map<string, string>> => {
  const rows = await prisma.toolConfig.findMany({ select: { slug: true, status: true } }).catch(() => []);
  return new Map(rows.map((row) => [row.slug, row.status]));
});

export function isLiveToolPage(slug: string, statuses: ReadonlyMap<string, string>) {
  return isToolAvailable(slug) && !['COMING_SOON', 'MAINTENANCE', 'DISABLED'].includes(statuses.get(slug) ?? 'LIVE');
}
