'use client';

import { useEffect, useState } from 'react';

/**
 * SSR-safe media query hook.
 *
 * Returns `false` on the server and during the first client render so the
 * initial markup matches the server-rendered HTML (no hydration mismatch),
 * then syncs to the real viewport inside `useEffect` and stays up to date on
 * resize. Consumers that branch on this value should treat `false` as the
 * "large/default" case so the SSR output is correct.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
