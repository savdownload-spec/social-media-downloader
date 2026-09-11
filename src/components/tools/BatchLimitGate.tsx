'use client';
/**
 * BatchLimitGate — reusable batch-file-limit UI for multi-file tools.
 *
 * Two surfaces, both rendered by this component:
 *
 * 1. `<BatchLimitHint>` — a small, always-visible line below the uploader.
 *    Shows the user's plan limit before they hit it.  Gives a quiet upgrade
 *    nudge for Free users.
 *
 * 2. `<BatchLimitWarning>` — shown when the user's selection exceeds the
 *    limit.  Lists which files are over the limit, explains why, and offers
 *    an Upgrade CTA.  Does NOT remove files — the caller keeps state intact.
 *
 * Accessibility:
 *   - The warning region carries role="alert" so screen readers announce it.
 *   - The Upgrade link is a proper <a> (keyboard-focusable, href present).
 *   - Color is never the sole indicator — icon + text + border all differ.
 *   - Supports light and dark themes via Tailwind dark: variants.
 */

import Link from 'next/link';
import { ArrowRight, Info, Lock, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolBatchLimits } from '@/lib/batchLimits';
import { PLAN_LABEL } from '@/lib/batchLimits';
import type { PlanTier } from '@/types/plans';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const UPGRADE_HREF = '/pricing';

/** Label for the next tier above `plan`, or null when already at the top. */
function nextPlanLabel(plan: PlanTier): string | null {
  switch (plan) {
    case 'FREE': return PLAN_LABEL['PRO'];
    case 'PRO':  return PLAN_LABEL['LIFETIME'];
    default:     return null;
  }
}

/** The batch limit the NEXT tier would give for this tool. */
function nextPlanLimit(plan: PlanTier, limits: ToolBatchLimits): number {
  switch (plan) {
    case 'FREE': return limits.pro;
    case 'PRO':  return limits.lifetime;
    default:     return limits.lifetime;
  }
}

// ---------------------------------------------------------------------------
// BatchLimitHint — shown below the uploader, always visible (subtle)
// ---------------------------------------------------------------------------

export type BatchLimitHintProps = {
  /** The tool's slug — only used for aria label text. */
  slug?: string;
  /** Effective max files for this user's current plan. */
  limit: number;
  /** User's current plan tier. */
  plan: PlanTier;
  /** Full limits for the tool (all tiers). */
  allLimits: ToolBatchLimits;
  /** True while the plan is being fetched from the API. */
  loading?: boolean;
  /** Whether the user can upgrade to get a higher limit. */
  canUpgrade: boolean;
  className?: string;
};

/**
 * Quiet one-line hint rendered below the upload zone.
 * Free users see an upgrade nudge; paid users see a reassuring confirmation.
 */
export function BatchLimitHint({
  limit,
  plan,
  allLimits,
  loading = false,
  canUpgrade,
  className,
}: BatchLimitHintProps) {
  if (loading) {
    // Render a stable-width skeleton so layout doesn't shift.
    return (
      <p className={cn('h-4 w-48 animate-pulse rounded bg-surface', className)} aria-hidden />
    );
  }

  const planName  = PLAN_LABEL[plan];
  const nextLabel = nextPlanLabel(plan);
  const nextLimit = nextPlanLimit(plan, allLimits);

  return (
    <div className={cn('flex items-center justify-between gap-3 text-xs text-text-muted', className)}>
      {/* Current-plan limit */}
      <span className="flex items-center gap-1.5">
        <Info className="h-3.5 w-3.5 shrink-0 text-text-subtle" aria-hidden />
        <span>
          <span className="font-medium text-text-subtle">{planName}:</span>{' '}
          up to <span className="font-semibold text-text">{limit}</span> files per batch
        </span>
      </span>

      {/* Upgrade nudge (only for upgradable plans) */}
      {canUpgrade && nextLabel && (
        <Link
          href={UPGRADE_HREF}
          className={cn(
            'inline-flex items-center gap-1 shrink-0 font-medium',
            'text-primary hover:text-primary-hover underline-offset-2 hover:underline',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded',
          )}
          aria-label={`Upgrade to ${nextLabel} for up to ${nextLimit} files`}
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          {nextLabel}: up to {nextLimit} files
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      )}

      {/* Already on highest plan */}
      {!canUpgrade && plan !== 'FREE' && (
        <span className="text-text-subtle">You're on the highest plan</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BatchLimitWarning — shown when selected files exceed the limit
// ---------------------------------------------------------------------------

export type BatchLimitWarningProps = {
  /** The number of files currently selected. */
  selectedCount: number;
  /** Max allowed for this user's plan. */
  limit: number;
  /** User's plan tier. */
  plan: PlanTier;
  /** Full limits object so we can show the next tier's value. */
  allLimits: ToolBatchLimits;
  /** Whether the user can upgrade for more files. */
  canUpgrade: boolean;
  /**
   * Names of files that are OVER the limit (indices limit..selectedCount-1).
   * Showing file names makes it crystal-clear which files to remove.
   */
  excessFileNames?: string[];
  /** Called when the user clicks "Remove excess files". */
  onRemoveExcess?: () => void;
  className?: string;
};

/**
 * Inline warning shown when the user selects more files than their plan allows.
 *
 * Behaviour:
 *   - Does NOT remove files automatically.
 *   - Shows exactly which files are over the limit.
 *   - Provides a one-click "Remove excess" action so they can continue free.
 *   - Offers an Upgrade CTA to raise the limit instead.
 *   - Uses role="alert" so screen readers announce it immediately.
 */
export function BatchLimitWarning({
  selectedCount,
  limit,
  plan,
  allLimits,
  canUpgrade,
  excessFileNames = [],
  onRemoveExcess,
  className,
}: BatchLimitWarningProps) {
  const overBy     = selectedCount - limit;
  const planName   = PLAN_LABEL[plan];
  const nextLabel  = nextPlanLabel(plan);
  const nextLimit  = nextPlanLimit(plan, allLimits);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        // Container
        'rounded-2xl border p-4 text-sm',
        // Colour: amber/warning — distinct from error red, distinct from info blue
        'border-amber-200 bg-amber-50 text-amber-900',
        'dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200',
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <Lock
          className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-snug">
            {planName} plan: up to {limit} file{limit === 1 ? '' : 's'} per batch
          </p>
          <p className="mt-0.5 text-amber-800 dark:text-amber-300">
            You've selected {selectedCount} files —{' '}
            <span className="font-medium">{overBy} file{overBy === 1 ? '' : 's'} over the limit</span>.
            {' '}The first {limit} file{limit === 1 ? '' : 's'} will be kept; the rest are highlighted below.
          </p>

          {/* Excess file list */}
          {excessFileNames.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-amber-800 dark:text-amber-300">
              {excessFileNames.map((name) => (
                <li key={name} className="flex items-center gap-1.5">
                  <X className="h-3 w-3 shrink-0 text-amber-500" aria-hidden />
                  <span className="truncate">{name}</span>
                  <span className="shrink-0 text-amber-500">(exceeds limit)</span>
                </li>
              ))}
            </ul>
          )}

          {/* Action row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Remove excess action */}
            {onRemoveExcess && (
              <button
                type="button"
                onClick={onRemoveExcess}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                  'text-xs font-semibold',
                  'border border-amber-300 bg-white text-amber-800',
                  'hover:bg-amber-50 active:scale-[0.98] transition-all',
                  'dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                )}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Remove {overBy} excess file{overBy === 1 ? '' : 's'}
              </button>
            )}

            {/* Upgrade CTA */}
            {canUpgrade && nextLabel && (
              <Link
                href={UPGRADE_HREF}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                  'text-xs font-semibold',
                  'bg-gradient-brand text-white shadow-glow-sm',
                  'hover:opacity-90 active:scale-[0.98] transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                )}
                aria-label={`Upgrade plan to process up to ${nextLimit} files per batch`}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Upgrade to {nextLabel} — up to {nextLimit} files
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            )}

            {/* Already at the highest plan — show a different message */}
            {!canUpgrade && (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                You're already on the highest plan.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
