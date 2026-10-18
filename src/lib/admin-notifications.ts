import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export type AdminNotificationInput = {
  type: string;
  section: 'support' | 'comments' | 'reviews' | 'affiliates' | 'payments' | 'subscriptions';
  entityType: string;
  entityId: string;
  title: string;
  message: string;
  href: string;
  dedupeKey: string;
};

/** Create one trusted server-side notification for a stable domain event. */
export async function createAdminNotification(db: Db, input: AdminNotificationInput) {
  return db.adminNotification.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: input,
    update: {},
  });
}
