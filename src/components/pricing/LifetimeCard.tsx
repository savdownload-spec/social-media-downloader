import Link from 'next/link';
import { Check, Coins, Infinity as InfinityIcon } from 'lucide-react';
import { HighlightFrame } from '@/components/pricing/HighlightFrame';
import { lifetime, WAITLIST_CTA } from '@/config/pricing';

/**
 * The one-time long-term offer. A single wide, premium card so it reads as a
 * distinct option — and the fair-use note (a FINITE credit bank, not
 * unlimited) sits right under the benefits, not buried in the FAQ.
 */
export function LifetimeCard() {
  return (
    <div className="mx-auto max-w-3xl">
      <HighlightFrame variant="value" badge="LIFETIME" className="p-8 md:p-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          {/* Price + CTA */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
              <InfinityIcon className="h-3.5 w-3.5 flex-shrink-0" /> One-time
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-x-1.5">
              <span className="text-5xl font-bold tracking-tight text-text">{lifetime.price}</span>
              <span className="mb-1.5 text-sm text-text-muted">{lifetime.period}</span>
            </div>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-light px-2.5 py-1 text-xs font-semibold text-accent-hover">
              <Coins className="h-3.5 w-3.5 flex-shrink-0" /> {lifetime.creditsLabel}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-text-muted">{lifetime.tagline}</p>

            <Link
              href={WAITLIST_CTA.href}
              className="mt-6 flex w-full items-center justify-center rounded-2xl bg-gradient-brand bg-[length:200%_200%] py-3 font-semibold text-white shadow-glow-lg transition-all hover:bg-[position:100%_50%]"
            >
              {WAITLIST_CTA.label}
            </Link>
          </div>

          {/* Benefits */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">What&apos;s included</p>
            <ul className="mt-4 space-y-3">
              {lifetime.benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2.5 text-sm text-text">
                  <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-accent-light">
                    <Check className="h-3 w-3 text-accent-hover" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-border-light bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-subtle">Fair use</p>
          <ul className="mt-2 space-y-1.5">
            {lifetime.fairUse.map((rule) => (
              <li key={rule} className="text-sm leading-relaxed text-text-muted">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </HighlightFrame>
    </div>
  );
}
