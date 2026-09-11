/**
 * Centralized batch-file-limit configuration for every multi-file SavDown tool.
 *
 * This is the SINGLE SOURCE OF TRUTH for how many files a user may submit in
 * one batch, per tool, per plan tier.  No tool component or API route should
 * hardcode its own limit — they must all import from here.
 *
 * Admin overrides:
 *   The ToolConfig Prisma model carries three nullable columns that shadow
 *   these defaults at runtime:
 *     batchLimitFree     → overrides DEFAULTS[slug].free
 *     batchLimitPro      → overrides DEFAULTS[slug].pro
 *     batchLimitLifetime → overrides DEFAULTS[slug].lifetime
 *   When a column is NULL (or the row is missing) the default below is used.
 *
 * Adding a new multi-file tool:
 *   1. Add its slug(s) to MULTI_FILE_TOOL_SLUGS.
 *   2. Add a DEFAULTS entry with sensible free/pro/max/lifetime numbers.
 *   3. Register the tool in src/config/functionalTools.ts as usual.
 *
 * Rules applied when choosing limits:
 *   - Free  : conservative — low enough to feel like a trial, high enough to
 *             be genuinely useful.
 *   - Pro   : comfortable for regular creative work.
 *   - Max   : reserved tier; set equal to lifetime for now.
 *   - Lifetime: generous one-time purchasers; not "unlimited" — a real cap
 *               prevents abuse.
 */

import type { PlanTier } from '@/types/plans';

// ---------------------------------------------------------------------------
// Tool-level limits
// ---------------------------------------------------------------------------

export type ToolBatchLimits = {
  /** Max files per batch for the Free plan. */
  free: number;
  /** Max files per batch for the Pro subscription. */
  pro: number;
  /** Max files per batch for the (future) Max plan. */
  max: number;
  /** Max files per batch for the Lifetime purchase. */
  lifetime: number;
  /** Optional hard cap on total batch size in bytes (applies across all plans). */
  maxBatchBytes?: number;
  /** Optional hard cap on a single file in bytes (applies across all plans). */
  maxFileBytes?: number;
};

/**
 * Default per-tool limits.
 *
 * Values are intentional — see reasoning above.
 * Tool slugs that share a component (e.g. all PdfTool slugs) each have their
 * own entry so they can diverge independently in the future or via Admin.
 */
const DEFAULTS: Record<string, ToolBatchLimits> = {
  /* ── PDF tools ─────────────────────────────────────────────────────────── */
  // Merge: needs ≥2 to be useful; Free can do small booklets, Pro handles
  // larger document collections.
  'merge-pdf':    { free: 5,  pro: 30, max: 50, lifetime: 50, maxFileBytes: 50 * 1024 * 1024, maxBatchBytes: 150 * 1024 * 1024 },
  // Split: one PDF per job is common; allow batches so power users can
  // process an archive of reports at once.
  'split-pdf':    { free: 5,  pro: 20, max: 50, lifetime: 50, maxFileBytes: 50 * 1024 * 1024, maxBatchBytes: 150 * 1024 * 1024 },
  // Compress: document-heavy workflow; higher free is friendlier.
  'compress-pdf': { free: 10, pro: 30, max: 50, lifetime: 50, maxFileBytes: 50 * 1024 * 1024, maxBatchBytes: 150 * 1024 * 1024 },
  // JPG→PDF: designers often need to package a whole shoot; Free is generous
  // because the per-job cost is already captured by credits.
  'jpg-to-pdf':   { free: 10, pro: 50, max: 80, lifetime: 80, maxFileBytes: 50 * 1024 * 1024, maxBatchBytes: 150 * 1024 * 1024 },
  // PDF→JPG: rendering is CPU-heavy per page; keep Free lower.
  'pdf-to-jpg':   { free: 5,  pro: 20, max: 50, lifetime: 50, maxFileBytes: 50 * 1024 * 1024, maxBatchBytes: 150 * 1024 * 1024 },
};

/** Every slug that currently has multi-file batch support. */
export const MULTI_FILE_TOOL_SLUGS: readonly string[] = Object.keys(DEFAULTS);

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

/**
 * Returns the batch-file limits for a tool, merging in any admin DB overrides.
 *
 * `dbOverrides` comes from a ToolConfig row's nullable override columns
 * (`batchLimitFree`, `batchLimitPro`, `batchLimitLifetime`).
 * Pass `undefined` / `null` for columns that have not been set — they will
 * fall back to the default silently.
 */
export function getToolBatchLimits(
  slug: string,
  dbOverrides?: {
    batchLimitFree?: number | null;
    batchLimitPro?: number | null;
    batchLimitMax?: number | null;
    batchLimitLifetime?: number | null;
  } | null,
): ToolBatchLimits {
  const base: ToolBatchLimits = DEFAULTS[slug] ?? {
    free: 5, pro: 20, max: 50, lifetime: 50,
  };

  if (!dbOverrides) return base;

  return {
    ...base,
    free:     dbOverrides.batchLimitFree     ?? base.free,
    pro:      dbOverrides.batchLimitPro      ?? base.pro,
    max:      dbOverrides.batchLimitMax      ?? base.max,
    lifetime: dbOverrides.batchLimitLifetime ?? base.lifetime,
  };
}

/**
 * Returns the effective max-files value for a specific plan tier.
 *
 * Use this both in the frontend (to inform the UI) and in the backend
 * (to validate the incoming request).
 */
export function maxFilesForPlan(limits: ToolBatchLimits, plan: PlanTier): number {
  switch (plan) {
    case 'PRO':      return limits.pro;
    case 'MAX':      return limits.max;
    case 'LIFETIME': return limits.lifetime;
    default:         return limits.free; // FREE (and any unknown tier)
  }
}

/**
 * True when the user is on a plan below LIFETIME, meaning an upgrade exists
 * that would give them a higher batch limit.
 */
export function canUpgradeBatchLimit(plan: PlanTier, limits: ToolBatchLimits): boolean {
  const current = maxFilesForPlan(limits, plan);
  // LIFETIME is the highest tier — no further upgrade available.
  return plan !== 'LIFETIME' && current < limits.lifetime;
}

/**
 * Human-readable plan label used in limit hints.
 * Keep consistent with WorkspaceCreditsBar's PLAN_LABEL map.
 */
export const PLAN_LABEL: Record<PlanTier, string> = {
  FREE:     'Free',
  PRO:      'Pro',
  MAX:      'Max',
  LIFETIME: 'Lifetime',
};
