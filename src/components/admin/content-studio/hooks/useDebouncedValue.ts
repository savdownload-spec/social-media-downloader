'use client';

import { useEffect, useState } from 'react';

/**
 * Debounces a changing value so expensive derived work (SEO/readability
 * analysis over the whole article) doesn't run on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
