import Link from 'next/link';
import { Coins, Infinity as InfinityIcon } from 'lucide-react';
import { HighlightFrame } from '@/components/pricing/HighlightFrame';
import type { PackView } from '@/config/pricing';

/**
 * A one-time credit pack. Leads with credits, then price, the derived per-1,000
 * rate, and a savings badge computed from the baseline pack.
 */
export function CreditPackCard({ pack }: { pack: PackView }) {
  const highlighted = pack.badge !== null;

  const cta = highlighted
    ? 'mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm text-white font-semibold bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all'
    : 'mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold bg-white text-text border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-all';

  return (
    <HighlightFrame variant={pack.badge ?? 'none'} badge={pack.badgeLabel} className="p-6">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{pack.name}</span>
          {pack.savePercent > 0 && (
            <span className="rounded-full bg-accent-light px-2 py-0.5 text-[11px] font-bold text-accent-hover">
              SAVE {pack.savePercent}%
            </span>
          )}
        </div>
        <p className="mt-1.5 text-sm text-text-muted">{pack.tagline}</p>

        <div className="mt-5 flex items-center gap-2">
          <Coins className="h-6 w-6 flex-shrink-0 text-primary" />
          <span className="text-3xl font-bold tracking-tight text-text">{pack.credits}</span>
          <span className="text-sm text-text-muted">credits</span>
        </div>
        {pack.bonus && (
          <p className="mt-1 text-xs font-semibold text-accent-hover">
            {pack.baseCredits} + {pack.bonus} bonus
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-end gap-x-1.5">
          <span className="text-2xl font-bold tracking-tight text-text">{pack.price}</span>
          <span className="mb-0.5 text-sm text-text-muted">one-time</span>
        </div>
        <p className="mt-1 text-xs text-text-subtle">{pack.perThousand}</p>

        <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary">
          <InfinityIcon className="h-3.5 w-3.5 flex-shrink-0" /> Credits never expire
        </div>

        <div className="mt-auto">
          <Link href={pack.ctaHref} className={cta}>
            {pack.ctaLabel}
          </Link>
        </div>
      </div>
    </HighlightFrame>
  );
}
