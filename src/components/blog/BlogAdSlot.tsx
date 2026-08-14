import { Megaphone } from 'lucide-react';

type BlogAdSlotProps = {
  slot: 'TOP_BANNER' | 'SIDEBAR_AD' | 'IN_ARTICLE_AD' | 'SECONDARY_AD';
  className?: string;
};

const slotCopy = {
  TOP_BANNER: {
    label: 'ADVERTISEMENT',
    detail: 'Top banner placement',
    size: 'min-h-[92px] md:min-h-[108px]',
  },
  SIDEBAR_AD: {
    label: 'ADVERTISEMENT',
    detail: 'Sidebar placement',
    size: 'min-h-[250px]',
  },
  IN_ARTICLE_AD: {
    label: 'ADVERTISEMENT',
    detail: 'In-article placement',
    size: 'min-h-[132px]',
  },
  SECONDARY_AD: {
    label: 'ADVERTISEMENT',
    detail: 'Secondary placement',
    size: 'min-h-[180px]',
  },
} as const;

export function BlogAdSlot({ slot, className = '' }: BlogAdSlotProps) {
  const copy = slotCopy[slot];
  return (
    <div
      aria-label={`${copy.detail} reserved for future advertising`}
      className={`flex ${copy.size} w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/55 px-5 text-center ${className}`}
    >
      <Megaphone className="mb-2 h-4 w-4 text-text-subtle" aria-hidden="true" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-subtle">
        {copy.label}
      </span>
      <span className="mt-1 text-xs text-text-subtle">{copy.detail}</span>
    </div>
  );
}
