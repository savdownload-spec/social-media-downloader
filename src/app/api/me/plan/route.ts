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
import { getBillingSummary } from '@/lib/billing';
import { prisma } from '@/lib/prisma';
import { getToolBatchLimits, MULTI_FILE_TOOL_SLUGS } from '@/lib/batchLimits';
import type { PlanTier } from '@/types/plans';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  // Unauthenticated → treat as FREE so the UI still renders correctly.
  if (!userId) {
    return Response.json({ ok: true, plan: 'FREE' as PlanTier, limits: buildLimits(null) });
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

  return Response.json({ ok: true, plan, limits: buildLimits(configs) });
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
