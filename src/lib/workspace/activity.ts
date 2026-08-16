import { prisma } from '@/lib/prisma';
import { toolsBySlug } from '@/config/tools';
import { getCatalogTool } from '@/config/catalog';

export type ActivityItem = {
  id: string;
  tool: string;
  toolName: string;
  toolHref: string | null;
  platform: string;
  sourceUrl: string;
  status: string;
  createdAt: Date;
};

/**
 * Reads a user's real Download log (write-only audit rows — no persisted
 * file, no thumbnail). Shared by the Home, Downloads, and Activity screens
 * so there is exactly one query to keep in sync with the schema.
 */
export async function getUserActivity(userId: string, limit = 200): Promise<ActivityItem[]> {
  const rows = await prisma.download.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.map(toActivityItem);
}

function toActivityItem(row: {
  id: string;
  tool: string;
  platform: string;
  sourceUrl: string;
  status: string;
  createdAt: Date;
}): ActivityItem {
  const downloaderTool = toolsBySlug.get(row.tool);
  const catalogTool = getCatalogTool(row.tool);
  return {
    id: row.id,
    tool: row.tool,
    toolName: downloaderTool?.name ?? catalogTool?.name ?? row.tool,
    toolHref: downloaderTool || catalogTool ? `/tools/${row.tool}` : null,
    platform: row.platform,
    sourceUrl: row.sourceUrl,
    status: row.status,
    createdAt: row.createdAt,
  };
}
