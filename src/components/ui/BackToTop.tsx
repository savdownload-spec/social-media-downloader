'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

const VISIBILITY_THRESHOLD = 450;

type BackToTopProps = {
  hidden?: boolean;
};

export function BackToTop({ hidden = false }: BackToTopProps) {
  const [pastThreshold, setPastThreshold] = useState(false);
  const pastThresholdRef = useRef(false);

  useEffect(() => {
    let frame: number | null = null;

    const update = () => {
      frame = null;
      const next = window.scrollY > VISIBILITY_THRESHOLD;
      if (next !== pastThresholdRef.current) {
        pastThresholdRef.current = next;
        setPastThreshold(next);
      }
    };

    const onScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!pastThreshold || hidden) return null;

  function scrollToTop() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  return (
    <button
      type="button"
      aria-label="Back To Top"
      onClick={scrollToTop}
      className="relative z-0 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border bg-white text-primary shadow-soft-lg transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:bg-card motion-reduce:transition-none sm:h-14 sm:w-14"
    >
      <ArrowUp aria-hidden="true" className="h-5 w-5" />
    </button>
  );
}
