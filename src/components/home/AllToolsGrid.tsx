'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { tools } from '@/config/tools';
import { getToolMeta, type ToolCategory } from '@/config/toolMeta';

type Filter = 'all' | ToolCategory;
const filters: Filter[] = ['all', 'Video', 'Photo', 'Thumbnail', 'Audio'];
const filterLabel: Record<Filter, string> = {
  all: 'All',
  Video: 'Video',
  Photo: 'Photos',
  Thumbnail: 'Thumbnails',
  Audio: 'Audio',
};

export function AllToolsGrid() {
  const [filter, setFilter] = useState<Filter>('all');
  const visible = tools.filter((t) => filter === 'all' || getToolMeta(t.slug).category === filter);

  return (
    <Section variant="default" id="tools">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-text leading-[1.05]">
          Every Tool You Need, <span className="text-gradient">In One Place.</span>
        </h2>
        <p className="mt-5 text-base md:text-lg text-text-muted leading-relaxed">
          Every tool you need to save what you love, right at your fingertips. All are 100% free
          and easy to use. Download videos, reels, photos, thumbnails, and audio from every major
          platform with just a few clicks.
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
          const m = getToolMeta(tool.slug);
          const Icon = m.icon;
          return (
            <motion.div key={tool.slug} layout transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              <Link
                href={`/tools/${tool.slug}`}
                className="group flex flex-col h-full bg-white border border-border rounded-2xl p-8 shadow-soft hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <span className={`w-14 h-14 rounded-2xl ${m.tile} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </span>
                  <ArrowUpRight className="w-5 h-5 text-text-subtle opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
                <h3 className="mt-6 text-lg font-bold text-text tracking-tight group-hover:text-primary transition-colors">
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
    </Section>
  );
}
