import Link from 'next/link';
import { Check, Coins } from 'lucide-react';
import { HighlightFrame } from '@/components/pricing/HighlightFrame';
import type { PlanView } from '@/config/pricing';

/**
 * One subscription card (Free or Pro). Consumes a derived PlanView, so all
 * prices, credits and the calculated yearly saving come from the pricing model.
 */
export function PlanCard({ plan }: { plan: PlanView }) {
  const highlighted = plan.badge !== null;

  const cta = highlighted
    ? 'mt-7 flex items-center justify-center w-full py-3 rounded-2xl text-white font-semibold bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all'
    : 'mt-7 flex items-center justify-center w-full py-3 rounded-2xl font-semibold bg-white text-text border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-all';

  return (
    <HighlightFrame variant={plan.badge ?? 'none'} badge={plan.badgeLabel} className="p-6 md:p-7">
      <div className="flex h-full flex-col">
        <h3 className="text-lg font-bold text-text">{plan.name}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{plan.tagline}</p>

        <div className="mt-5 flex flex-wrap items-end gap-x-1.5">
          <span className="text-4xl font-bold tracking-tight text-text">{plan.price}</span>
          <span className="mb-1 text-sm text-text-muted">/ {plan.period}</span>
        </div>
        {/* Reserve the line so cards stay aligned whether or not there's a note. */}
        <p className="mt-1 min-h-[1rem] text-xs text-text-subtle">{plan.priceNote ?? ''}</p>

        {plan.valueMessage && (
          <div className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-accent-light px-2.5 py-1 text-xs font-bold text-accent-hover">
            {plan.valueMessage}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-border-light bg-surface p-3">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Coins className="h-4 w-4 flex-shrink-0" /> {plan.credits}
          </div>
          {plan.creditsNote && (
            <p className="mt-0.5 pl-[1.375rem] text-xs text-text-subtle">{plan.creditsNote}</p>
          )}
        </div>

        <ul className="mt-5 space-y-2.5">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-text">
              <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-accent-light">
                <Check className="h-3 w-3 text-accent-hover" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-auto">
          <Link href={plan.ctaHref} className={cta}>
            {plan.ctaLabel}
          </Link>
        </div>
      </div>
    </HighlightFrame>
  );
}
