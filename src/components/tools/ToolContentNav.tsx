'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type ToolContentNavItem = {
  id: string;
  label: string;
};

type ToolContentNavProps = {
  items: ToolContentNavItem[];
};

export function ToolContentNav({ items }: ToolContentNavProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');

  useEffect(() => {
    let frame = 0;

    const updateActiveSection = () => {
      frame = 0;
      const sections = items
        .map(({ id }) => document.getElementById(id))
        .filter((section): section is HTMLElement => Boolean(section));

      if (!sections.length) return;

      const activationLine = 144;
      const current = sections.reduce((active, section) => {
        return section.getBoundingClientRect().top <= activationLine ? section : active;
      }, sections[0]);

      setActiveId(current.id);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <nav aria-label="About this tool sections" className="mt-7">
      <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-text-subtle">
        On this page
      </p>
      <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap lg:grid lg:grid-cols-1 lg:border-l lg:border-border">
        {items.map((item, index) => {
          const isActive = activeId === item.id;

          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={isActive ? 'location' : undefined}
              onClick={() => setActiveId(item.id)}
              className={cn(
                'group flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                'lg:-ml-px lg:rounded-l-none lg:border-l-2',
                isActive
                  ? 'bg-primary-light text-primary lg:border-primary'
                  : 'text-text-muted hover:bg-surface hover:text-text lg:border-transparent',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  isActive ? 'bg-primary text-white' : 'bg-surface text-text-subtle group-hover:text-text-muted',
                )}
              >
                {index + 1}
              </span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
