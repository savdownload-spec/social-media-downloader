/**
 * Server-side batch-limit gate for PDF (and future multi-file) tool routes.
 *
 * Call `checkBatchLimit(slug, fileCount, req)` at the top of every multi-file
 * API route BEFORE doing any processing.  It:
 *   1. Identifies the calling user (unauthenticated → FREE plan).
 *   2. Reads the tool's limits (code defaults merged with any DB admin overrides).
 *   3. Compares `fileCount` against the user's allowed maximum.
 *   4. Returns a ready-made 403 `NextResponse` when the limit is exceeded, or
 *      `null` when the request is within the limit.
 *
 * The response body is structured JSON so the frontend can distinguish a plan
 * limit from other errors and render the upgrade UX:
 *
 *   {
 *     ok: false,
 *     error: "Free plan allows up to 5 files per batch. You sent 12.",
 *     code: "BATCH_LIMIT_EXCEEDED",
 *     allowedCount: 5,
 *     sentCount: 12,
 *     upgradeEligible: true
 *   }
 *
 * Security:
 *   - Plan is always read fresh from the DB via getBillingSummary(), which also
 *     performs the lazy Free credit refill.  The JWT is never trusted for this.
 *   - The gate runs before any file download or processing work begins, so
 *     excess files are rejected without any compute cost.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBillingSummary } from '@/lib/billing';
import { prisma } from '@/lib/prisma';
import {
  getToolBatchLimits,
  maxFilesForPlan,
  canUpgradeBatchLimit,
  PLAN_LABEL,
} from '@/lib/batchLimits';
import type { PlanTier } from '@/types/plans';

export type BatchLimitViolation = NextResponse;

/**
 * Returns null when the request is within the plan's batch limit,
 * or a ready-made 403 NextResponse when it exceeds it.
 *
 * @param slug       The catalog slug of the tool being called (e.g. 'merge-pdf').
 * @param fileCount  Number of files in the incoming request.
 * @param req        The incoming Request (used to resolve the auth session).
 */
export async function checkBatchLimit(
  slug: string,
  fileCount: number,
  req: Request,
): Promise<BatchLimitViolation | null> {
  // Identify the calling user — gracefully treat unauthenticated as FREE.
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  let plan: PlanTier = 'FREE';
  if (userId) {
    const summary = await getBillingSummary(userId);
    if (summary) plan = summary.plan as PlanTier;
  }

  // Read any admin DB overrides for this tool's batch limits.
  const config = await prisma.toolConfig.findUnique({
    where: { slug },
    select: {
      batchLimitFree: true,
      batchLimitPro: true,
      batchLimitMax: true,
      batchLimitLifetime: true,
    },
  });

  const limits = getToolBatchLimits(slug, config ?? null);
  const allowedCount = maxFilesForPlan(limits, plan);

  if (fileCount <= allowedCount) return null; // within limit — proceed

  const upgradeEligible = canUpgradeBatchLimit(plan, limits);
  const planName = PLAN_LABEL[plan];

  return NextResponse.json(
    {
      ok: false,
      error: `${planName} plan allows up to ${allowedCount} file${allowedCount === 1 ? '' : 's'} per batch. You sent ${fileCount}.${upgradeEligible ? ' Upgrade your plan to increase this limit.' : ''}`,
      code: 'BATCH_LIMIT_EXCEEDED',
      allowedCount,
      sentCount: fileCount,
      upgradeEligible,
    },
    { status: 403 },
  );
}
