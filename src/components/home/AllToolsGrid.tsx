'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { useTranslation } from '@/i18n';
import {
  catalog,
  toolGroups,
  HOMEPAGE_DESKTOP_LIMIT,
  HOMEPAGE_MOBILE_LIMIT,
  isToolAvailable,
  type ToolGroup,
} from '@/config/catalog';

type Filter = 'all' | ToolGroup;

export function AllToolsGrid() {
  const t = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');

  // Ref placed just above the tab bar. On tab change we scroll here so the
  // first row of cards is visible below the sticky header + sticky tabs.
  // The scroll target sits at the section heading, which means the heading
  // briefly comes into view then the tabs stick naturally as the user sees
  // the refreshed card list — no extra jump, no flicker on load.
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const filters: Filter[] = ['all', ...toolGroups];

  const visible =
    filter === 'all'
      ? catalog.slice(0, HOMEPAGE_DESKTOP_LIMIT)
      : catalog.filter((t) => t.group === filter);

  function selectFilter(f: Filter) {
    setFilter(f);
    // Scroll the anchor into view, offset so it lands just below the sticky
    // header (64 px) + a little breathing room. requestAnimationFrame gives
    // React one tick to commit the new filter before we measure positions.
    requestAnimationFrame(() => {
      const el = scrollAnchorRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      // 64px header + 8px breathing room
      const offset = 64 + 8;
      window.scrollTo({ top: top - offset, behavior: 'smooth' });
    });
  }

  return (
    <Section variant="default" id="tools">
      {/* Scroll anchor — sits at the very top of the Tools section content.
          Clicking a tab scrolls here so the section heading is visible and
          the sticky tab bar takes its position naturally beneath the header. */}
      <div ref={scrollAnchorRef} aria-hidden />

      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text leading-[1.05]">
          {t('catalog.title') || 'Every Tool You Need, In One Place.'}
        </h2>
        <p className="mt-5 text-base md:text-lg text-text-muted leading-relaxed">
          {t('catalog.subtitle') || 'A growing toolkit for creators and marketers, all in one place.'}
        </p>
      </div>

      {/* Category filter tabs — sticky within this section only.
          The outer div is a transparent sticky positioner with no background
          or border of its own. The visible surface lives on the inner pill
          row so it stays content-width, rounded, and contained — matching
          the card grid below rather than bleeding edge-to-edge.
          top-16 accounts for the 64 px sticky site header. */}
      <div className="sticky top-16 z-20 mt-10 py-2">
        <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-2xl bg-surface/70 dark:bg-card/70 backdrop-blur-md border border-border/50 dark:border-border/40 px-4 py-3">
          {filters.map((f) => {
            const active = filter === f;
            const label = f === 'all' ? t('common.all') || 'All' : t(`catalog.groups.${f}`) || f;
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

      {/* Tool cards */}
      <motion.div
        layout
        className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {visible.map((tool, i) => {
          const Icon = tool.icon;
          const live = isToolAvailable(tool.slug);
          const mobileHidden = filter === 'all' && i >= HOMEPAGE_MOBILE_LIMIT;
          
          const toolName = t(`catalog.tools.${tool.slug}.name`) || tool.name;
          const toolDesc = t(`catalog.tools.${tool.slug}.description`) || tool.description;

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
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-primary-light text-primary">{t('common.soon')}</span>
                  )}
                </div>
                <h3 className="mt-5 text-base font-bold text-text tracking-tight group-hover:text-primary transition-colors">
                  {toolName}
                </h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed flex-1">
                  {toolDesc}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* See the full list */}
      <div className="mt-12 text-center">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
        >
          {t('common.viewAll')} <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="mt-3 text-sm text-text-muted">{t('catalog.footerDesc') || 'Downloaders, image, video, PDF, AI, SEO, and utility tools.'}</p>
      </div>
    </Section>
  );
}
