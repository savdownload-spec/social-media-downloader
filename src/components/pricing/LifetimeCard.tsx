import { Check, Coins, Infinity as InfinityIcon } from 'lucide-react';
import { CheckoutButton } from '@/components/pricing/CheckoutButton';
import { lifetime } from '@/config/pricing';

/**
 * The one-time long-term offer. A single wide card rather than a grid, so it
 * reads as a distinct option instead of a fourth tier — and the fair-use note
 * sits directly under the benefits rather than being buried in the FAQ.
 */
export function LifetimeCard() {
  return (
    <div className="max-w-3xl mx-auto rounded-3xl gradient-ring shadow-glow-lg">
      <div className="rounded-[23px] bg-white p-8 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
          {/* Price + CTA */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-light text-primary text-xs font-semibold">
              <InfinityIcon className="w-3.5 h-3.5 flex-shrink-0" /> {lifetime.name}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-x-1.5">
              <span className="text-5xl font-bold tracking-tight text-text">{lifetime.price}</span>
              <span className="text-sm text-text-muted mb-1.5">{lifetime.period}</span>
            </div>

            <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-light text-accent-hover text-xs font-semibold">
              <Coins className="w-3.5 h-3.5 flex-shrink-0" /> {lifetime.credits}
            </div>

            <p className="mt-4 text-sm text-text-muted leading-relaxed">{lifetime.tagline}</p>

            <CheckoutButton
              item={lifetime.checkout.item}
              label={lifetime.checkout.label}
              className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-white font-semibold bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all"
            />
          </div>

          {/* What's included */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
              What&apos;s included
            </p>
            <ul className="mt-4 space-y-3">
              {lifetime.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-text">
                  <span className="mt-0.5 w-4 h-4 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-accent-hover" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-surface border border-border-light p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">
            Fair use
          </p>
          <ul className="mt-2 space-y-1.5">
            {lifetime.fairUse.map((rule) => (
              <li key={rule} className="text-sm text-text-muted leading-relaxed">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
