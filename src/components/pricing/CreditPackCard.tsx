import { Coins } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { CheckoutButton } from '@/components/pricing/CheckoutButton';
import type { CreditPack } from '@/config/pricing';

/**
 * A one-time credit top-up. Deliberately lighter than {@link PlanCard} so the
 * subscription tiers stay the visual anchor of the page.
 */
export function CreditPackCard({ pack }: { pack: CreditPack }) {
  return (
    <div className="group relative h-full flex flex-col rounded-2xl border border-border bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          {pack.name}
        </span>
        {pack.bestValue && <Badge tone="accent">Best value</Badge>}
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <Coins className="w-5 h-5 text-primary flex-shrink-0 self-center" />
        <span className="text-3xl font-bold tracking-tight text-text">{pack.credits}</span>
        <span className="text-sm text-text-muted">credits</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-1.5">
        <span className="text-2xl font-bold tracking-tight text-text">{pack.price}</span>
        <span className="text-sm text-text-muted mb-0.5">one-time</span>
      </div>
      <p className="mt-1 text-xs text-text-subtle">{pack.rate}</p>

      <CheckoutButton
        item={pack.item}
        label={`Buy ${pack.credits} credits`}
        className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-sm bg-white text-text border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-all"
      />
    </div>
  );
}
