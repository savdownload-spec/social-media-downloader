import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const JOB_LEASE_MINUTES = 5;

/** Requeue jobs whose worker lease expired (crashed/timed-out invocation). */
export async function releaseExpiredLeases(): Promise<number> {
  const result = await prisma.publishingJob.updateMany({
    where: { status: 'CLAIMED', leaseUntil: { lt: new Date() } },
    data: { status: 'QUEUED', claimedBy: null, claimedAt: null, leaseUntil: null },
  });
  return result.count;
}

/**
 * Atomically claim due jobs. `FOR UPDATE SKIP LOCKED` keeps concurrent
 * triggers (external pinger + admin "run now") from double-publishing.
 */
export async function claimDueJobs(limit: number, workerId: string): Promise<Array<{ id: string }>> {
  const safeLimit = Math.max(1, Math.min(limit, 25));
  return prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE "PublishingJob"
       SET "status" = 'CLAIMED',
           "claimedBy" = ${workerId},
           "claimedAt" = now(),
           "leaseUntil" = now() + interval '5 minutes',
           "updatedAt" = now()
     WHERE "id" IN (
       SELECT "id" FROM "PublishingJob"
        WHERE "status" = 'QUEUED' AND "runAt" <= now()
        ORDER BY "runAt" ASC
        LIMIT ${safeLimit}
        FOR UPDATE SKIP LOCKED
     )
    RETURNING "id"
  `);
}

export async function cancelQueuedJobs(postId: string): Promise<number> {
  const result = await prisma.publishingJob.updateMany({
    where: { postId, status: { in: ['QUEUED', 'CLAIMED'] } },
    data: { status: 'CANCELLED', claimedBy: null, claimedAt: null, leaseUntil: null },
  });
  return result.count;
}

/** Claim one specific queued job (used by "Publish now" for a prompt result). */
export async function claimJobById(jobId: string, workerId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE "PublishingJob"
       SET "status" = 'CLAIMED',
           "claimedBy" = ${workerId},
           "claimedAt" = now(),
           "leaseUntil" = now() + interval '5 minutes',
           "updatedAt" = now()
     WHERE "id" = ${jobId} AND "status" = 'QUEUED'
    RETURNING "id"
  `);
  return rows.length > 0;
}
