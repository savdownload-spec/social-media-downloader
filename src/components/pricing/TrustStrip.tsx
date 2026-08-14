import { Rocket, Infinity as InfinityIcon, RotateCcw, ReceiptText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { trustPoints } from '@/config/pricing';

// Order matches trustPoints: Start free · Credits never expire · Cancel anytime · No hidden fees.
const icons: LucideIcon[] = [Rocket, InfinityIcon, RotateCcw, ReceiptText];

/**
 * A quiet reassurance row under the pricing cards. Every claim here has to be
 * one SavDown actually keeps — see the note in `@/config/pricing`.
 */
export function TrustStrip() {
  return (
    <Container className="pb-4">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-white/70 p-2.5 shadow-soft backdrop-blur md:p-3">
        {/* gap-px over a tinted grid background draws the dividers, which stays
            correct at 1, 2 and 4 columns without per-cell border exceptions. */}
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl bg-border-light sm:grid-cols-2 lg:grid-cols-4">
          {trustPoints.map((point, i) => {
            const Icon = icons[i];
            return (
              <div key={point.title} className="bg-white p-5">
                <dt className="flex items-center gap-2 text-sm font-semibold text-text">
                  <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                  {point.title}
                </dt>
                <dd className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {point.description}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </Container>
  );
}
