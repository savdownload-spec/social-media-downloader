/**
 * useBatchLimit
 *
 * Client-side hook that returns the effective batch-file limit for a specific
 * tool slug, for the currently signed-in user's plan tier.
 *
 * Usage:
 *   const { plan, limit, canUpgrade, loading } = useBatchLimit('merge-pdf');
 *
 * - `limit`      The maximum number of files this user may submit in one batch.
 * - `plan`       Their current PlanTier ('FREE' | 'PRO' | 'MAX' | 'LIFETIME').
 * - `canUpgrade` True when a higher tier exists that would raise this limit.
 * - `allLimits`  The full ToolBatchLimits for the slug (all tiers), useful for
 *                showing "Pro: up to N files" upgrade hints.
 * - `loading`    True during the initial fetch.
 * - `error`      Set if the fetch failed; the hook falls back to FREE limits.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getToolBatchLimits,
  maxFilesForPlan,
  canUpgradeBatchLimit,
  type ToolBatchLimits,
} from '@/lib/batchLimits';
import type { PlanTier } from '@/types/plans';

export type BatchLimitResult = {
  plan: PlanTier;
  limit: number;
  allLimits: ToolBatchLimits;
  canUpgrade: boolean;
  loading: boolean;
  error: boolean;
};

// A tiny module-level cache so multiple tool components on the same page
// share one fetch and do not hammer the API.
let cachedPlan: PlanTier | null = null;
let cachedLimitsMap: Record<string, ToolBatchLimits> | null = null;
let fetchPromise: Promise<void> | null = null;

function clearCache() {
  cachedPlan = null;
  cachedLimitsMap = null;
  fetchPromise = null;
}

// Exported for testing / sign-out scenarios.
export { clearCache as clearBatchLimitCache };

async function loadPlanData(): Promise<void> {
  const res = await fetch('/api/me/plan', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load plan');
  const data = await res.json() as {
    ok: boolean;
    plan: PlanTier;
    limits: Record<string, ToolBatchLimits>;
  };
  cachedPlan = data.plan;
  cachedLimitsMap = data.limits;
}

export function useBatchLimit(slug: string): BatchLimitResult {
  const [state, setState] = useState<{
    plan: PlanTier;
    loading: boolean;
    error: boolean;
    limitsMap: Record<string, ToolBatchLimits> | null;
  }>({
    plan: 'FREE',
    loading: true,
    error: false,
    limitsMap: null,
  });

  // Track whether this instance is still mounted so we don't set state after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Already cached from a prior render — apply immediately.
    if (cachedPlan !== null && cachedLimitsMap !== null) {
      setState({ plan: cachedPlan, loading: false, error: false, limitsMap: cachedLimitsMap });
      return;
    }

    // Deduplicate concurrent fetches from multiple hook instances.
    if (!fetchPromise) {
      fetchPromise = loadPlanData().catch(() => {
        // On error, ensure the module-level state is clean so the next mount retries.
        clearCache();
      });
    }

    fetchPromise.then(() => {
      if (!mountedRef.current) return;
      if (cachedPlan !== null && cachedLimitsMap !== null) {
        setState({ plan: cachedPlan, loading: false, error: false, limitsMap: cachedLimitsMap });
      } else {
        setState({ plan: 'FREE', loading: false, error: true, limitsMap: null });
      }
    });
  }, []);

  // Derive the per-slug result from whatever state we have.
  const allLimits = state.limitsMap?.[slug] ?? getToolBatchLimits(slug, null);
  const limit = maxFilesForPlan(allLimits, state.plan);
  const canUpgrade = canUpgradeBatchLimit(state.plan, allLimits);

  return {
    plan: state.plan,
    limit,
    allLimits,
    canUpgrade,
    loading: state.loading,
    error: state.error,
  };
}
