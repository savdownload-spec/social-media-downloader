/**
 * Structural Google AdSense container. It remains visually neutral until a real
 * publisher client and slot identifier are configured, preventing a fake-ad UI
 * while reserving stable responsive space for future inventory.
 */
type BlogAdSlotProps = {
  slot: 'TOP_BANNER' | 'SIDEBAR_AD' | 'IN_ARTICLE_AD' | 'SECONDARY_AD';
  className?: string;
  slotId?: string;
};

const slotSizing: Record<BlogAdSlotProps['slot'], string> = {
  TOP_BANNER: 'min-h-[96px] md:min-h-[112px]',
  SIDEBAR_AD: 'min-h-[250px]',
  IN_ARTICLE_AD: 'min-h-[120px] md:min-h-[150px]',
  SECONDARY_AD: 'min-h-[160px] md:min-h-[180px]',
};

export function BlogAdSlot({ slot, className = '', slotId }: BlogAdSlotProps) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const hasConfiguredAd = Boolean(clientId && slotId);

  return (
    <div
      className={`${slotSizing[slot]} w-full overflow-hidden rounded-2xl ${className}`}
      aria-hidden={!hasConfiguredAd}
      data-ad-slot={slot}
    >
      {hasConfiguredAd && (
        <ins
          className="adsbygoogle block h-full w-full"
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
}