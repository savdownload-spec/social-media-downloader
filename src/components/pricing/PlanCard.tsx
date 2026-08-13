import Link from 'next/link';
import { Check, Coins } from 'lucide-react';
import { CheckoutButton } from '@/components/pricing/CheckoutButton';
import type { BillingPeriod, Plan } from '@/config/pricing';

/**
 * One subscription tier. Purely presentational — the billing period is chosen
 * by the parent so every card switches together.
 */
export function PlanCard({ plan, billing }: { plan: Plan; billing: BillingPeriod }) {
  const showYearlyNote = billing === 'yearly' && Boolean(plan.yearlyNote);
  /** The real difference against twelve monthly payments — only shown on yearly. */
  const saving = billing === 'yearly' ? plan.yearlySaving : undefined;

  const ctaClass = plan.highlight
    ? 'mt-8 flex items-center justify-center w-full py-3 rounded-2xl text-white font-semibold bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all'
    : 'mt-8 flex items-center justify-center w-full py-3 rounded-2xl font-semibold bg-white text-text border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-all';

  return (
    <div
      className={
        plan.highlight
          ? 'relative rounded-3xl gradient-ring shadow-glow-lg'
          : 'relative rounded-3xl border border-border bg-white shadow-soft'
      }
    >
      <div className={plan.highlight ? 'rounded-[23px] bg-white h-full p-8' : 'h-full p-8'}>
        {plan.highlight && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-brand text-white text-xs font-semibold shadow-glow-lg whitespace-nowrap">
            Most Popular
          </span>
        )}

        <h3 className="text-lg font-bold text-text">{plan.name}</h3>

        <div className="mt-3 flex flex-wrap items-end gap-x-1.5">
          <span className="text-4xl font-bold tracking-tight text-text">
            {plan.price[billing]}
          </span>
          <span className="text-sm text-text-muted mb-1">/ {plan.period[billing]}</span>
          {saving && (
            <span className="mb-1.5 inline-flex items-center rounded-full bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent-hover">
              Save {saving.amount}
            </span>
          )}
        </div>

        {/* Reserve the line in both states so the cards stay aligned on the toggle. */}
        <p className="mt-1 text-xs text-text-subtle min-h-[1rem]">
          {showYearlyNote ? plan.yearlyNote : ''}
        </p>

        {saving && (
          <p className="mt-1 text-xs text-text-subtle">
            Instead of{' '}
            <span className="line-through">{saving.monthlyTotal}</span> paying monthly
          </p>
        )}

        <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-light text-primary text-xs font-semibold">
          <Coins className="w-3.5 h-3.5 flex-shrink-0" /> {plan.credits}
        </div>

        <p className="mt-4 text-sm text-text-muted leading-relaxed">{plan.tagline}</p>

        <ul className="mt-6 space-y-3">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-text">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-accent-hover" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {plan.checkout ? (
          <CheckoutButton
            item={plan.checkout[billing].item}
            label={plan.checkout[billing].label}
            className={`${ctaClass} gap-2`}
          />
        ) : (
          plan.cta && (
            <Link href={plan.cta.href} className={ctaClass}>
              {plan.cta.label}
            </Link>
          )
        )}
      </div>
    </div>
  );
}
