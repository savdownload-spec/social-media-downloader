import { prisma } from '@/lib/prisma';
import { isToolRegistered } from '@/config/toolAvailability';

export const BLOCKED_STATUSES = new Set(['COMING_SOON', 'MAINTENANCE', 'DISABLED']);

export async function getToolStatuses(): Promise<Map<string, string>> {
  try {
    const rows = await prisma.toolConfig.findMany({ select: { slug: true, status: true } });
    return new Map(rows.map((r) => [r.slug, r.status]));
  } catch {
    return new Map();
  }
}

/** A tool counts as live only when its slug maps to a working processor
 *  (registry/policy) AND the admin-panel status is not blocking. The DB check
 *  alone carded policy-disabled routes as active because they had no row. */
export function isToolLive(slug: string, statuses: Map<string, string>): boolean {
  if (!isToolRegistered(slug)) return false;
  const status = statuses.get(slug);
  return !status || !BLOCKED_STATUSES.has(status);
}
