'use client';

import { useEffect, useRef, useState } from 'react';
import type { BlogHeading } from '@/components/blog/BlogPostBody';

// Matches the site header height plus breathing room so headings never land
// underneath the sticky navigation when a TOC link is activated.
const SCROLL_OFFSET = 96;

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
  window.history.replaceState(null, '', `#${id}`);
}

async function copyLink(id: string) {
  const url = `${window.location.origin}${window.location.pathname}#${id}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}

// Flat list of section headings — no nested sub-items and no expand controls.
// Posts that only use H3 for sections still get their headings listed.
function topLevelHeadings(headings: BlogHeading[]): BlogHeading[] {
  return headings.some((h) => h.level === 2)
    ? headings.filter((h) => h.level === 2)
    : headings;
}

type TocItemProps = {
  heading: BlogHeading;
  activeId: string;
  mode?: 'desktop' | 'mobile';
};

function TocItem({ heading, activeId, mode }: TocItemProps) {
  const isActive = activeId === heading.id;
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await copyLink(heading.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <li>
      <div className="group flex items-center gap-1">
        <a
          href={`#${heading.id}`}
          onClick={(e) => { e.preventDefault(); scrollToId(heading.id); }}
          className={`toc-item -ml-px flex min-h-[38px] flex-1 items-center rounded-r-lg border-l-2 py-2 pl-3.5 pr-2 text-[13px] leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
            isActive
              ? 'border-primary bg-gradient-to-r from-primary/[0.08] to-transparent font-semibold text-primary'
              : 'border-transparent text-text-muted hover:border-border hover:bg-surface/80 hover:text-text'
          }`}
          style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
          aria-current={isActive ? 'location' : undefined}
        >
          <span className="line-clamp-2">{heading.title}</span>
        </a>
        {mode === 'desktop' && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex min-h-[32px] min-w-[32px] shrink-0 items-center justify-center rounded-lg text-text-subtle opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Copy link to "${heading.title}"`}
            title={copied ? 'Copied!' : 'Copy link'}
          >
            {copied ? (
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>
        )}
      </div>
    </li>
  );
}

type TableOfContentsProps = {
  headings: BlogHeading[];
  mode?: 'desktop' | 'mobile';
};

export function TableOfContents({ headings, mode = 'desktop' }: TableOfContentsProps) {
  const items = topLevelHeadings(headings);
  const [activeId, setActiveId] = useState('');
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!headings.length) return;
    const ids = headings.map((h) => h.id);

    const update = () => {
      frameRef.current = null;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= SCROLL_OFFSET + 24) current = id;
        else break;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = ids[ids.length - 1];
      }
      setActiveId((prev) => (prev === current ? prev : current));
    };

    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [headings]);

  if (!items.length) return null;

  return (
    <nav aria-label="Table of contents">
      <ul className="space-y-0.5 border-l border-border/80" role="list">
        {items.map((heading) => (
          <TocItem key={heading.id} heading={heading} activeId={activeId} mode={mode} />
        ))}
      </ul>
    </nav>
  );
}
