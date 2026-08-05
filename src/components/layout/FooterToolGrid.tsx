'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { catalog, type ToolGroup } from '@/config/catalog';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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

/**
 * Priority order for the footer's collapsed view. The first N (12 desktop /
 * 6 mobile) entries are visible by default, so this order controls which tools
 * surface without expanding. The two must-show tools lead so they fall inside
 * the mobile cutoff of 6, followed by the other high-volume downloaders, then
 * every remaining catalog entry keeps its existing order.
 */
const PRIORITY_SLUGS = [
  'instagram-reels-downloader', // must-show (desktop)
  'tiktok-to-mp3', // must-show (mobile)
  'youtube-video-downloader',
  'tiktok-video-downloader',
  'youtube-to-mp3',
  'youtube-thumbnail-downloader',
  'instagram-video-downloader',
  'facebook-video-downloader',
  'x-video-downloader',
  'pinterest-video-downloader',
];

/** Desktop / mobile link budgets for the collapsed state. */
const DESKTOP_LIMIT = 12;
const MOBILE_LIMIT = 6;
const MOBILE_BREAKPOINT = '(max-width: 767px)';

/**
 * The collapsible "complete toolkit" section of the footer.
 *
 * Client component so it can drive the Load More / Show Less toggle with local
 * state + framer-motion, but it is still server-rendered: every one of the 56
 * tool links stays in the initial HTML for crawlers. Collapsed links are only
 * visually hidden (height + opacity), never removed from the DOM.
 */
export function FooterToolGrid() {
  const isMobile = useMediaQuery(MOBILE_BREAKPOINT);
  const limit = isMobile ? MOBILE_LIMIT : DESKTOP_LIMIT;
  const [expanded, setExpanded] = useState(false);

  /**
   * A stable priority-ordered copy of the catalog. Slugs in PRIORITY_SLUGS keep
   * their listed order; everything else follows in its original catalog order.
   * The first `limit` entries are shown by default.
   */
  const priorityIndex = useMemo(() => {
    const map = new Map<string, number>();
    PRIORITY_SLUGS.forEach((slug, i) => map.set(slug, i));
    return map;
  }, []);

  const visibleSlugs = useMemo(() => {
    const ordered = [...catalog].sort((a, b) => {
      const ia = priorityIndex.has(a.slug) ? priorityIndex.get(a.slug)! : PRIORITY_SLUGS.length;
      const ib = priorityIndex.has(b.slug) ? priorityIndex.get(b.slug)! : PRIORITY_SLUGS.length;
      if (ia !== ib) return ia - ib;
      return 0; // stable: preserves original catalog order within the same tier
    });
    return new Set(ordered.slice(0, limit).map((t) => t.slug));
  }, [priorityIndex, limit]);

  const toolsByGroup = useMemo(
    () =>
      columnOrder.map((group) => ({
        group,
        label: categoryLabels[group],
        tools: catalog.filter((t) => t.group === group),
      })),
    [],
  );

  const collapsedCount = useMemo(
    () => catalog.length - Math.min(limit, catalog.length),
    [limit],
  );
  const showToggle = collapsedCount > 0;

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
          See all tools <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-x-6 gap-y-10">
        {toolsByGroup.map(({ group, label, tools }) => {
          const visibleTools = tools.filter((t) => visibleSlugs.has(t.slug));
          const collapsedTools = tools.filter((t) => !visibleSlugs.has(t.slug));
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
                  smooth height + opacity animation (no AnimatePresence removal). */}
              {collapsedTools.length > 0 && (
                <motion.div
                  initial={false}
                  animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
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
              )}
            </div>
          );
        })}
      </div>

      {showToggle && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls="footer-tool-grid-collapse"
            className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-ink-muted hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
          >
            {expanded ? 'Show Less' : `Load More${collapsedCount ? ` (${collapsedCount})` : ''}`}
            <ChevronDown
              className="w-4 h-4 transition-transform duration-300 group-hover:text-white"
              style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>
        </div>
      )}
      {/* Span targeted by aria-controls so assistive tech can locate the
          collapsible region. */}
      <span id="footer-tool-grid-collapse" className="sr-only">
        {expanded ? 'All tools expanded' : `${collapsedCount} more tools available`}
      </span>
    </div>
  );
}
