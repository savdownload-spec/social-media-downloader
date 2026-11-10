'use client';

import { useEffect, useRef, useState } from 'react';

export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const update = () => {
      const article = document.querySelector('article') ?? document.querySelector('main');
      if (!article) {
        setProgress(0);
        return;
      }
      const { top, height } = article.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const scrolled = -top;
      const total = height - viewportH;
      const pct = total > 0 ? Math.min(100, Math.max(0, (scrolled / total) * 100)) : 0;
      setProgress(pct);
    };

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
      className="reading-progress-bar fixed top-0 left-0 right-0 z-50 h-[3px] pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <div
        className="h-full origin-left transition-transform duration-100 ease-out"
        style={{
          transform: `scaleX(${progress / 100})`,
          background: 'rgb(var(--primary))',
        }}
      />
    </div>
  );
}
