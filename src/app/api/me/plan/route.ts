/**
 * GET /api/me/plan
 *
 * Lightweight endpoint that returns the current user's plan tier and the
 * per-tool batch limits relevant to them.  Used by client-side hooks so tool
 * components can show the right limits without a server-component refactor.
 *
 * Response is intentionally minimal — only what the batch-limit UI needs.
 * The endpoint is unauthenticated-friendly: a 401 returns { plan: 'FREE' }
 * so unsigned-in visitors see the Free limits rather than a broken UI.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBillingSummary, getTierAllowance } from '@/lib/billing';
import { prisma } from '@/lib/prisma';
import { getToolBatchLimits, MULTI_FILE_TOOL_SLUGS } from '@/lib/batchLimits';
import { JOB_COST } from '@/lib/credits';
import type { PlanTier } from '@/types/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  // Unauthenticated → treat as FREE so the UI still renders correctly.
  if (!userId) {
    const allowance = await getTierAllowance('FREE');
    return Response.json({
      ok: true,
      authenticated: false,
      plan: 'FREE' as PlanTier,
      planName: allowance.name ?? null,
      totalCredits: null,
      planCredits: null,
      purchasedCredits: null,
      planAllowance: allowance.credits,
      planAllowancePeriod: allowance.period,
      planMonthlyCap: allowance.monthlyCap ?? null,
      creditsLabel: allowance.creditsLabel ?? null,
      creditsNote: allowance.creditsNote ?? null,
      imageToolCreditCost: JOB_COST.imageTool,
      limits: buildLimits(null),
    });
  }

  const summary = await getBillingSummary(userId);
  const plan: PlanTier = (summary?.plan ?? 'FREE') as PlanTier;

  // Read any admin DB overrides for multi-file tool slugs in one query.
  const configs = await prisma.toolConfig.findMany({
    where: { slug: { in: MULTI_FILE_TOOL_SLUGS as string[] } },
    select: {
      slug: true,
      batchLimitFree: true,
      batchLimitPro: true,
      batchLimitMax: true,
      batchLimitLifetime: true,
    },
  });

  return Response.json({
    ok: true,
    authenticated: true,
    plan,
    planName: summary?.planName ?? null,
    totalCredits: summary?.totalCredits ?? null,
    planCredits: summary?.planCredits ?? null,
    purchasedCredits: summary?.purchasedCredits ?? null,
    planAllowance: summary?.planAllowance ?? null,
    planAllowancePeriod: summary?.planAllowancePeriod ?? null,
    planMonthlyCap: summary?.planMonthlyCap ?? null,
    creditsLabel: summary?.planCreditsLabel ?? null,
    creditsNote: summary?.planCreditsNote ?? null,
    imageToolCreditCost: JOB_COST.imageTool,
    limits: buildLimits(configs),
  });
}

type DbConfig = {
  slug: string;
  batchLimitFree: number | null;
  batchLimitPro: number | null;
  batchLimitMax: number | null;
  batchLimitLifetime: number | null;
};

function buildLimits(configs: DbConfig[] | null): Record<string, ReturnType<typeof getToolBatchLimits>> {
  const configMap = new Map(configs?.map((c) => [c.slug, c]) ?? []);
  return Object.fromEntries(
    (MULTI_FILE_TOOL_SLUGS as string[]).map((slug) => [
      slug,
      getToolBatchLimits(slug, configMap.get(slug) ?? null),
    ]),
  );
}
