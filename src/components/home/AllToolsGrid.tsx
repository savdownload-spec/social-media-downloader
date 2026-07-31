'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { catalog, toolGroups, HOMEPAGE_LIMIT, isToolAvailable, type ToolGroup } from '@/config/catalog';

type Filter = 'all' | ToolGroup;
const filters: Filter[] = ['all', ...toolGroups];
const filterLabel: Record<Filter, string> = {
  all: 'All',
  Downloaders: 'Downloaders',
  Image: 'Image',
  Video: 'Video',
  PDF: 'PDF',
  AI: 'AI',
  SEO: 'SEO',
  Utility: 'Utility',
};

export function AllToolsGrid() {
  const [filter, setFilter] = useState<Filter>('all');
  const visible =
    filter === 'all'
      ? catalog.slice(0, HOMEPAGE_LIMIT)
      : catalog.filter((t) => t.group === filter);

  return (
    <Section variant="default" id="tools">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text leading-[1.05]">
          Every Tool You Need, <span className="text-gradient">In One Place.</span>
        </h2>
        <p className="mt-5 text-base md:text-lg text-text-muted leading-relaxed">
          A growing toolkit for creators and marketers, all in one place. Download from every major
          platform, edit images and video, work with PDFs, and speed up your workflow with AI, all
          100% free and easy to use.
        </p>
      </div>

      {/* Category filter tabs */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
        {filters.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-text text-white shadow-soft-md'
                  : 'bg-white text-text-muted border border-border hover:border-primary/40 hover:text-text'
              }`}
            >
              {filterLabel[f]}
            </button>
          );
        })}
      </div>

      {/* Tool cards */}
      <motion.div
        layout
        className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      >
        {visible.map((tool) => {
          const Icon = tool.icon;
          const live = isToolAvailable(tool.slug);
          return (
            <motion.div key={tool.slug} layout transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              <Link
                href={`/tools/${tool.slug}`}
                className="group flex flex-col h-full bg-white border border-border rounded-2xl p-7 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <span className={`w-14 h-14 rounded-2xl ${tool.tile} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </span>
                  {live ? (
                    <ArrowUpRight className="w-5 h-5 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-primary-light text-primary">Soon</span>
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

      {/* See the full list */}
      <div className="mt-12 text-center">
        <Link
          href="/tools"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all"
        >
          View All Tools <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="mt-3 text-sm text-text-muted">Downloaders, image, video, PDF, AI, SEO, and utility tools.</p>
      </div>
    </Section>
  );
}
