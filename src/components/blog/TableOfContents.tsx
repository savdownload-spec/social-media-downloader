'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { BlogHeading } from '@/components/blog/BlogPostBody';

type TocHeading = BlogHeading & { children?: BlogHeading[] };

function buildTree(headings: BlogHeading[]): TocHeading[] {
  const tree: TocHeading[] = [];
  let currentH2: TocHeading | null = null;
  let currentH3: TocHeading | null = null;

  for (const h of headings) {
    if (h.level === 2) {
      currentH2 = { ...h, children: [] };
      currentH3 = null;
      tree.push(currentH2);
    } else if (h.level === 3) {
      if (currentH2) {
        currentH3 = { ...h, children: [] };
        currentH2.children = currentH2.children ?? [];
        currentH2.children.push(currentH3);
      } else {
        // Orphan H3 — promote to top level
        currentH3 = { ...h, children: [] };
        tree.push(currentH3);
      }
    } else if (h.level === 4) {
      if (currentH3) {
        currentH3.children = currentH3.children ?? [];
        currentH3.children.push({ ...h });
      } else if (currentH2) {
        currentH2.children = currentH2.children ?? [];
        currentH2.children.push({ ...h });
      }
    }
  }
  return tree;
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function copyLink(id: string) {
  const url = `${window.location.origin}${window.location.pathname}#${id}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Fallback: create a temporary input
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}

type TocItemProps = {
  heading: TocHeading;
  activeId: string;
  depth?: number;
  expanded: boolean;
  onToggle: () => void;
  mode?: 'desktop' | 'mobile';
};

function TocItem({ heading, activeId, depth = 0, expanded, onToggle, mode }: TocItemProps) {
  const isActive = activeId === heading.id;
  const hasChildren = (heading.children?.length ?? 0) > 0;
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await copyLink(heading.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const indentClass = depth === 1 ? 'pl-4' : depth === 2 ? 'pl-8' : '';

  return (
    <li>
      <div className={`group flex items-center gap-1 ${indentClass}`}>
        <a
          href={`#${heading.id}`}
          onClick={(e) => { e.preventDefault(); scrollToId(heading.id); }}
          className={`toc-item flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm leading-5 transition-colors min-h-[44px]
            ${isActive
              ? 'border-l-2 pl-1.5 font-medium'
              : 'border-l-2 pl-1.5 border-transparent text-text-muted hover:bg-primary-light hover:text-primary'
            }`}
          style={isActive ? { borderColor: 'rgb(var(--primary))', color: 'rgb(var(--primary))' } : {}}
          aria-current={isActive ? 'location' : undefined}
        >
          <span className="line-clamp-2">{heading.title}</span>
        </a>
        {!hasChildren && mode === 'desktop' && (
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-primary"
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
        {hasChildren && (
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-text-muted hover:text-primary transition-colors"
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
            aria-expanded={expanded}
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${expanded ? '' : '-rotate-90'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <ul className="mt-0.5 space-y-0.5" role="list">
          {heading.children!.map((child) => (
            <TocItem
              key={child.id}
              heading={child as TocHeading}
              activeId={activeId}
              depth={depth + 1}
              expanded={true}
              onToggle={() => {}}
              mode={mode}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

type TableOfContentsProps = {
  headings: BlogHeading[];
  mode?: 'desktop' | 'mobile';
};

export function TableOfContents({ headings, mode = 'desktop' }: TableOfContentsProps) {
  const tree = buildTree(headings);
  const [activeId, setActiveId] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(tree.map((h) => h.id)));
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!headings.length) return;

    const ids = headings.map((h) => h.id);
    // Track intersection for all heading elements
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible heading
        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => e.target.id);

        if (visible.length > 0) {
          // Pick the first one in document order
          const first = ids.find((id) => visible.includes(id));
          if (first) setActiveId(first);
        }
      },
      { threshold: 0, rootMargin: '-80px 0px -40% 0px' },
    );

    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    }

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [headings]);

  if (!tree.length) return null;

  return (
    <nav aria-label="Table of contents">
      <ul className="space-y-0.5" role="list">
        {tree.map((heading) => (
          <TocItem
            key={heading.id}
            heading={heading}
            activeId={activeId}
            depth={0}
            expanded={expandedIds.has(heading.id)}
            onToggle={() => handleToggle(heading.id)}
            mode={mode}
          />
        ))}
      </ul>
    </nav>
  );
}
