import { prisma } from '@/lib/prisma';

export const BLOCKED_STATUSES = new Set(['COMING_SOON', 'MAINTENANCE', 'DISABLED']);

export async function getToolStatuses(): Promise<Map<string, string>> {
  try {
    const rows = await prisma.toolConfig.findMany({ select: { slug: true, status: true } });
    return new Map(rows.map((r) => [r.slug, r.status]));
  } catch {
    return new Map();
  }
}

export function isToolLive(slug: string, statuses: Map<string, string>): boolean {
  const status = statuses.get(slug);
  if (!status) return true;
  return !BLOCKED_STATUSES.has(status);
}
