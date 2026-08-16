'use client';
import { useState } from 'react';
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
  
  const filters: Filter[] = ['all', ...toolGroups];
  
  const visible =
    filter === 'all'
      ? catalog.slice(0, HOMEPAGE_DESKTOP_LIMIT)
      : catalog.filter((t) => t.group === filter);

  return (
    <Section variant="default" id="tools">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text leading-[1.05]">
          {t('catalog.title') || 'Every Tool You Need, In One Place.'}
        </h2>
        <p className="mt-5 text-base md:text-lg text-text-muted leading-relaxed">
          {t('catalog.subtitle') || 'A growing toolkit for creators and marketers, all in one place.'}
        </p>
      </div>

      {/* Category filter tabs */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
        {filters.map((f) => {
          const active = filter === f;
          const label = f === 'all' ? t('common.all') || 'All' : t(`catalog.groups.${f}`) || f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
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
