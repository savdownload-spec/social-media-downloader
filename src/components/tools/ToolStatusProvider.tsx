'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { isToolLive } from '@/lib/toolStatuses';

/**
 * Makes server-resolved tool statuses available to every client component
 * without additional fetches. Seeded once in the root layout from
 * `getToolStatuses()`, so every surface (MegaMenu, CommandBar, card grids)
 * reads the same admin-panel data.
 *
 * Usage:
 *   const { isLive, getStatus } = useToolStatuses();
 */

type ToolStatusContextValue = {
  /** True when the tool should be considered available (no "Soon" badge). */
  isLive: (slug: string) => boolean;
  /** Raw status string from the DB, or 'LIVE' when no row exists. */
  getStatus: (slug: string) => string;
};

const defaultValue: ToolStatusContextValue = {
  isLive: () => true,
  getStatus: () => 'LIVE',
};

const ToolStatusContext = createContext<ToolStatusContextValue>(defaultValue);

interface Props {
  /**
   * Plain slug->status object serialised from the server (Map is not
   * serialisable across the Server->Client boundary).
   */
  value: Record<string, string>;
  children: ReactNode;
}

export function ToolStatusProvider({ value, children }: Props) {
  const map = new Map(Object.entries(value));

  const ctx: ToolStatusContextValue = {
    isLive: (slug) => isToolLive(slug, map),
    getStatus: (slug) => map.get(slug) ?? 'LIVE',
  };

  return <ToolStatusContext.Provider value={ctx}>{children}</ToolStatusContext.Provider>;
}

export function useToolStatuses(): ToolStatusContextValue {
  return useContext(ToolStatusContext);
}
