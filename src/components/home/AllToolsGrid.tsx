'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import {
  catalog,
  toolGroups,
  HOMEPAGE_DESKTOP_LIMIT,
  HOMEPAGE_MOBILE_LIMIT,
  type ToolGroup,
} from '@/config/catalog';
import { isToolLive } from '@/lib/toolStatuses';

type Filter = 'all' | ToolGroup;

interface Props {
  /**
   * Serialised slug->status map from the server (passed as a plain object so
   * it survives the Server->Client boundary). Missing slugs are treated as
   * LIVE (fail-open). Fetched once per page render by the parent Server Component.
   */
  toolStatuses: Record<string, string>;
}

export function AllToolsGrid({ toolStatuses }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const statusMap = new Map(Object.entries(toolStatuses));

  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const filters: Filter[] = ['all', ...toolGroups];

  const visible =
    filter === 'all'
      ? catalog.slice(0, HOMEPAGE_DESKTOP_LIMIT)
      : catalog.filter((t) => t.group === filter);

  function selectFilter(f: Filter) {
    setFilter(f);
    requestAnimationFrame(() => {
      const el = scrollAnchorRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const offset = 64 + 8;
      window.scrollTo({ top: top - offset, behavior: 'smooth' });
    });
  }

  return (
    <Section variant="default" id="tools">
      <div ref={scrollAnchorRef} aria-hidden />

      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text leading-[1.05]">
          {"All Tools"}
        </h2>
        <p className="mt-5 text-base md:text-lg text-text-muted leading-relaxed">
          {"The complete toolkit, social media downloaders plus image, video, PDF, AI, SEO, and utility tools."}
        </p>
      </div>

      <div className="sticky top-16 z-20 mt-10 py-2">
        <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-2xl bg-surface/70 dark:bg-card/70 backdrop-blur-md border border-border/50 dark:border-border/40 px-4 py-3">
          {filters.map((f) => {
            const active = filter === f;
            const label = f === 'all' ? 'All' : f;
            return (
              <button
                key={f}
                onClick={() => selectFilter(f)}
                aria-pressed={active}
                className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                  active
                    ? 'bg-text text-white dark:bg-primary shadow-soft-md'
                    : 'bg-white dark:bg-card text-text-muted border border-border hover:border-primary/40 hover:text-text'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <motion.div
        layout
        className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {visible.map((tool, i) => {
          const Icon = tool.icon;
          const live = isToolLive(tool.slug, statusMap);
          const mobileHidden = filter === 'all' && i >= HOMEPAGE_MOBILE_LIMIT;

          return (
            <motion.div
              key={tool.slug}
              layout
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={mobileHidden ? 'hidden md:block' : undefined}
            >
              <Link
                href={`/tools/${tool.slug}`}
                className="group flex flex-col h-full bg-white dark:bg-card border border-border rounded-2xl p-7 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <span className={`w-14 h-14 rounded-2xl ${tool.tile} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </span>
                  {live ? (
                    <ArrowUpRight className="w-5 h-5 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-primary-light text-primary">{"Soon"}</span>
                  )}
                </div>
                <h3 className="mt-5 text-base font-bold text-text tracking-tight group-hover:text-primary transition-colors">
                  {tool.name}
                </h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed flex-1">
                  {tool.description}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-12 text-center">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
        >
          {"View All Tools"} <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="mt-3 text-sm text-text-muted">{"Every tool you need, in one place. Free daily credits, no watermarks."}</p>
      </div>
    </Section>
  );
}
