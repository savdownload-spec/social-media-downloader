import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PlanHighlight } from '@/config/pricing';

/**
 * The premium border + badge treatment shared by the highlighted plan, credit
 * pack and lifetime cards.
 *
 * Anti-clipping design (the previous version cut the border and badge):
 *   • The gradient border is a 1.5px padded wrapper — a real box around the
 *     whole card, so every corner and edge is drawn.
 *   • The badge is an absolute child of a `relative` wrapper that never sets
 *     overflow-hidden, and sits on its own z-layer, so it floats cleanly above
 *     the top edge instead of being clipped by the card's rounded corners.
 *   • `h-full` on every layer keeps cards equal height in a stretch grid.
 *
 * Two variants that read as related but distinct:
 *   • popular → indigo→fuchsia (brand) border, purple glow
 *   • value   → primary→accent (green) border, so "best value" is visually
 *     tied to savings without being confused with "most popular".
 */
const VARIANTS: Record<
  Exclude<PlanHighlight, 'none'>,
  { border: string; glow: string; badge: string }
> = {
  popular: {
    border: 'from-indigo-brand via-primary to-fuchsia-brand',
    glow: 'shadow-glow-lg',
    badge: 'bg-gradient-brand text-white',
  },
  value: {
    border: 'from-primary via-primary to-accent',
    glow: 'shadow-glow-lg',
    badge: 'bg-accent-hover text-white',
  },
};

export function HighlightFrame({
  variant,
  badge,
  className,
  children,
}: {
  variant: PlanHighlight;
  badge?: string;
  /** Classes for the inner white surface (padding etc.). */
  className?: string;
  children: ReactNode;
}) {
  if (variant === 'none') {
    return (
      <div className="relative h-full">
        <div className={cn('h-full rounded-3xl border border-border bg-white shadow-soft', className)}>
          {children}
        </div>
      </div>
    );
  }

  const styles = VARIANTS[variant];

  return (
    <div className="relative h-full">
      {/* The badge floats as its own layer ABOVE the top border, not on it:
          `bottom-full` pins its bottom edge to the top of the card and `mb-2`
          lifts it clear, so the complete gradient border — all four sides and
          corners — stays visible and uninterrupted behind it. It never masks
          or clips the stroke, regardless of badge height. */}
      {badge && (
        <span
          className={cn(
            'absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] shadow-soft-md',
            styles.badge,
          )}
        >
          {badge}
        </span>
      )}
      {/* Uniform 1.5px stroke: the inner radius must be the outer radius
          (rounded-3xl = 32px) minus the padding (1.5px) = 30.5px, or the
          gradient bunches up thicker at the corners than along the edges. */}
      <div className={cn('h-full rounded-3xl bg-gradient-to-br p-[1.5px]', styles.border, styles.glow)}>
        <div className={cn('h-full rounded-[30.5px] bg-white', className)}>{children}</div>
      </div>
    </div>
  );
}
