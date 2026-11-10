'use client';

import { useEffect, useState } from 'react';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTop = () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollTop}
      className="back-to-top-btn fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white dark:bg-card text-text-muted shadow-soft-lg transition-all hover:border-primary/30 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
      aria-label="Back to top"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
