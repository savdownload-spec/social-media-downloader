'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

/**
 * Client-only component that fetches the live community rating from the
 * reviews API. Renders a static fallback ("4.9") during SSR and before the
 * fetch resolves, so the parent Hero can remain a server component and the
 * LCP <h1> is never blocked on JavaScript execution.
 */
export function LiveRating() {
  const [liveRating, setLiveRating] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/reviews?limit=1')
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data.data.averageRating != null) {
          setLiveRating(data.data.averageRating);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {liveRating != null ? liveRating.toFixed(1) : '4.9'}
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 md:h-4 md:w-4" />
    </>
  );
}
