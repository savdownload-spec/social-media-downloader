'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_PRICING, type PricingConfig } from '@/config/pricing';

/**
 * Makes the server-resolved pricing model available to client components (the
 * nav dropdown, mobile nav, pricing tabs). Seeded once in the root layout from
 * `getPricingConfig()`, so every client surface reads the SAME data with no
 * extra fetch and no default-then-real flash.
 */
const PricingContext = createContext<PricingConfig>(DEFAULT_PRICING);

export function PricingProvider({ value, children }: { value: PricingConfig; children: ReactNode }) {
  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

export function usePricing(): PricingConfig {
  return useContext(PricingContext);
}
