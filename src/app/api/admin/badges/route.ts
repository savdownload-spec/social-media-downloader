/**
 * GET /api/admin/badges
 *
 * Lightweight endpoint that returns the badge counts the admin UI needs
 * to populate the bell indicator and sidebar badges. Only admins can call it.
 *
 * Counts are derived from real DB records:
 *   supportUnread  — total adminUnreadCount across all active conversations
 *   pendingReviews — reviews with status = 'PENDING'
 *
 * Kept intentionally cheap: two simple aggregate queries, no heavy joins.
 * The admin shell polls this every 30 s so the numbers stay fresh without
 * requiring websockets or SSE.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    return fail('Forbidden.', 403);
  }

  const [supportAgg, pendingReviews] = await Promise.all([
    // Sum of adminUnreadCount across all non-closed conversations.
    prisma.supportConversation.aggregate({
      _sum: { adminUnreadCount: true },
      where: { status: { notIn: ['CLOSED'] } },
    }),
    // Reviews waiting for admin action.
    prisma.review.count({ where: { status: 'PENDING' } }),
  ]);

  const supportUnread = supportAgg._sum.adminUnreadCount ?? 0;
  const total = supportUnread + pendingReviews;

  return ok({ supportUnread, pendingReviews, total });
}
