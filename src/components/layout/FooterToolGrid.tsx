'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { catalog, type ToolGroup } from '@/config/catalog';

/** Display labels for each tool category; hrefs point at the /tools group anchors. */
const categoryLabels: Record<ToolGroup, string> = {
  Downloaders: 'Social Media Downloaders',
  Image: 'Image Tools',
  Video: 'Video Tools',
  PDF: 'PDF Tools',
  AI: 'AI Tools',
  SEO: 'SEO Tools',
  Utility: 'Utility Tools',
};

/** Column order for the SEO mega-footer (all categories surfaced as columns). */
const columnOrder: ToolGroup[] = ['Downloaders', 'Image', 'Video', 'PDF', 'AI', 'SEO', 'Utility'];

/** Max tools shown per category before a "See More" button appears. */
const PER_CATEGORY_LIMIT = 10;

/**
 * The collapsible "complete toolkit" section of the footer.
 *
 * Each category shows up to `PER_CATEGORY_LIMIT` tools by default; categories
 * that overflow get their own "See More" button that toggles the rest with a
 * smooth height + opacity animation. Every tool link stays in the DOM at all
 * times (collapsed links are only visually hidden) so SEO is preserved, the
 * section is server-rendered, all 56 links are crawlable.
 */
export function FooterToolGrid() {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggle(group: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  }

  const toolsByGroup = columnOrder.map((group) => ({
    group,
    label: categoryLabels[group],
    tools: catalog.filter((t) => t.group === group),
  }));

  return (
    <div className="pt-12">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-1">
            The complete toolkit
          </p>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Browse the full toolkit
          </h2>
        </div>
        <Link
          href="/tools"
          className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-white transition-colors"
        >
          See All Tools <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-x-6 gap-y-10">
        {toolsByGroup.map(({ group, label, tools }) => {
          const visibleTools = tools.slice(0, PER_CATEGORY_LIMIT);
          const collapsedTools = tools.slice(PER_CATEGORY_LIMIT);
          const isOpen = expanded.has(group);
          const hasMore = collapsedTools.length > 0;
          const panelId = `footer-cat-${group.toLowerCase()}`;
          return (
            <div key={group} className="min-w-0">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
                <Link
                  href={`/tools#${group.toLowerCase()}`}
                  className="hover:text-gradient-light transition-colors"
                >
                  {label}
                </Link>
              </h3>
              <ul className="mt-4 space-y-2.5">
                {visibleTools.map((tool) => (
                  <li key={tool.slug}>
                    <Link
                      href={`/tools/${tool.slug}`}
                      className="text-[13px] text-ink-muted hover:text-white transition-colors leading-snug block"
                    >
                      {tool.name}
                    </Link>
                  </li>
                ))}
              </ul>
              {/* Collapsed links: always in the DOM for SEO, revealed via a
                  smooth height + opacity animation (no removal from the DOM). */}
              {hasMore && (
                <>
                  <motion.div
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                    id={panelId}
                  >
                    <ul className="space-y-2.5 pt-2.5">
                      {collapsedTools.map((tool) => (
                        <li key={tool.slug}>
                          <Link
                            href={`/tools/${tool.slug}`}
                            className="text-[13px] text-ink-muted hover:text-white transition-colors leading-snug block"
                          >
                            {tool.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                  <button
                    type="button"
                    onClick={() => toggle(group)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="group mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-white transition-colors"
                  >
                    {isOpen ? 'Show Less' : `See More (${collapsedTools.length})`}
                    <ChevronDown
                      className="w-3.5 h-3.5 transition-transform duration-300 group-hover:text-white"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
