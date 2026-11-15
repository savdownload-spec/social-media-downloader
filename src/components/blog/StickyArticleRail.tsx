'use client';

import { useEffect, useRef, type ReactNode } from 'react';

const HEADER_OFFSET = 96;

/**
 * Sticky article rail whose internal scroll follows the reader through the
 * article column. The movement is eased (frame-rate independent) instead of
 * snapping, so the "On this page" list glides and the lower cards — ad, promo,
 * topics — arrive smoothly by the end of the content. Scrollbars stay hidden.
 */
export function StickyArticleRail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const rail = ref.current;
    if (!rail) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let target = rail.scrollTop;
    let current = rail.scrollTop;
    let frame: number | null = null;
    let lastTime = 0;

    const computeTarget = () => {
      const maxRail = rail.scrollHeight - rail.clientHeight;
      const column = rail.parentElement;
      if (!column || maxRail <= 0) return 0;

      const columnTop = column.getBoundingClientRect().top + window.scrollY;
      const start = columnTop - HEADER_OFFSET;
      // Finish well before the column's end so the last card settles while the
      // reader is still beside the comments.
      const end = columnTop + column.offsetHeight - window.innerHeight - 400;
      const progress = end > start ? (window.scrollY - start) / (end - start) : 1;
      // Keep the whole TOC visible during most of the read; reveal the cards
      // below it only over the final stretch, like a deliberate hand-off.
      const reveal = Math.min(1, Math.max(0, (progress - 0.7) / 0.3));
      return reveal * maxRail;
    };

    const tick = (time: number) => {
      const delta = lastTime ? Math.min(100, time - lastTime) : 16;
      lastTime = time;
      const easing = 1 - Math.exp(-delta / 90);
      current += (target - current) * easing;

      if (Math.abs(target - current) < 0.5) {
        current = target;
        rail.scrollTop = current;
        frame = null;
        lastTime = 0;
        return;
      }
      rail.scrollTop = current;
      frame = window.requestAnimationFrame(tick);
    };

    const update = () => {
      target = computeTarget();
      if (reduced) {
        current = target;
        rail.scrollTop = target;
        return;
      }
      if (frame === null) {
        current = rail.scrollTop;
        lastTime = 0;
        frame = window.requestAnimationFrame(tick);
      }
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    observer.observe(rail);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, []);

  return (
    <aside
      ref={ref}
      data-article-rail
      aria-label="Article sidebar"
      className="space-y-5 [-ms-overflow-style:none] [scrollbar-width:none] lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:overscroll-contain [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </aside>
  );
}
