/**
 * GET /api/admin/badges
 *
 * Lightweight endpoint that returns the badge counts the admin UI needs
 * to populate the bell indicator and sidebar badges. Only admins can call it.
 *
 * Counts come from the shared AdminNotification ledger and are filtered by
 * the current admin's read receipts. The Admin shell polls this lightweight
 * endpoint so the bell and section badges stay synchronized.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string } | undefined;
  if (admin?.role !== 'ADMIN' || !admin.id) {
    return fail('Forbidden.', 403);
  }

  const unreadWhere = { resolvedAt: null, reads: { none: { adminId: admin.id } } } as const;
  const [notifications, grouped] = await Promise.all([
    prisma.adminNotification.findMany({
      where: unreadWhere,
      orderBy: { createdAt: 'desc' },
      take: 12,
      select: { id: true, type: true, section: true, entityId: true, title: true, message: true, href: true, createdAt: true },
    }),
    prisma.adminNotification.groupBy({
      by: ['section'],
      where: unreadWhere,
      _count: { _all: true },
    }),
  ]);

  const counts = Object.fromEntries(grouped.map((row) => [row.section, row._count._all]));
  const total = grouped.reduce((sum, row) => sum + row._count._all, 0);

  return ok({
    supportUnread: counts.support ?? 0,
    commentsUnread: counts.comments ?? 0,
    reviewsUnread: counts.reviews ?? 0,
    affiliatesUnread: counts.affiliates ?? 0,
    paymentsUnread: counts.payments ?? 0,
    subscriptionsUnread: counts.subscriptions ?? 0,
    total,
    notifications,
  });
}
