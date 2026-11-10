'use client';

import { useEffect, useState } from 'react';

type StickyArticleHeaderProps = {
  title: string;
  readingTime: string;
  sentinelId: string;
};

export function StickyArticleHeader({ title, readingTime, sentinelId }: StickyArticleHeaderProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show when sentinel has scrolled above the viewport
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelId]);

  return (
    <div
      className="sticky-article-header fixed top-0 left-0 right-0 z-40 border-b border-border bg-white/90 dark:bg-card/90 backdrop-blur-sm transition-transform duration-200"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      }}
      aria-hidden={!visible}
    >
      <div className="mx-auto max-w-6xl px-4 md:px-6 h-12 flex items-center gap-4">
        <p className="flex-1 min-w-0 text-sm font-semibold text-text truncate">{title}</p>
        <span className="shrink-0 text-xs text-text-muted">{readingTime}</span>
      </div>
    </div>
  );
}
