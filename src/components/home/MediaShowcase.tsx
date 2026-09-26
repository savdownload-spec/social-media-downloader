'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Section, SectionHeading } from '@/components/layout/Section';
import { getCatalogTool } from '@/config/catalog';
import { useTranslation } from '@/i18n';

/**
 * Tool slugs shown in this section.
 * Order determines grid position — keep the original ordering.
 */
const TOOL_SLUGS = [
  'youtube-video-downloader',
  'background-remover',
  'instagram-photo-downloader',
  'merge-pdf',
  'image-upscaler',
  'tiktok-video-downloader',
  'ai-thumbnail-generator',
  'pinterest-image-downloader',
  'facebook-video-downloader',
  'image-compressor',
  'instagram-reels-downloader',
  'pdf-to-word',
  'video-compressor',
  'ai-caption-generator',
  'x-video-downloader',
  'qr-code-generator',
] as const;

/**
 * Per-tool accent configuration.
 *
 * bg*     — card background (light / dark)
 * ring*   — subtle border (light / dark)
 * icon*   — icon tile bg + color (light / dark)
 * motion  — animation style for the icon
 *
 * Colors are intentionally tool/platform-specific, not generic purple.
 */
type MotionStyle = 'float' | 'pulse' | 'spin-slow' | 'bounce';

interface ToolAccent {
  // Light mode: card surface
  cardLight: string;
  // Dark mode: card surface
  cardDark: string;
  // Light mode: icon tile (bg + text color)
  tileLight: string;
  // Dark mode: icon tile
  tileDark: string;
  // Animation style for the icon
  motion: MotionStyle;
}

const ACCENTS: Record<string, ToolAccent> = {
  // YouTube → red
  'youtube-video-downloader': {
    cardLight: 'bg-red-50',          cardDark: 'dark:bg-red-950/40',
    tileLight: 'bg-red-100 text-red-600', tileDark: 'dark:bg-red-500/20 dark:text-red-400',
    motion: 'pulse',
  },
  // Background Remover → violet
  'background-remover': {
    cardLight: 'bg-violet-50',       cardDark: 'dark:bg-violet-950/40',
    tileLight: 'bg-violet-100 text-violet-600', tileDark: 'dark:bg-violet-500/20 dark:text-violet-400',
    motion: 'float',
  },
  // Instagram → rose/pink gradient feel → rose
  'instagram-photo-downloader': {
    cardLight: 'bg-rose-50',         cardDark: 'dark:bg-rose-950/40',
    tileLight: 'bg-rose-100 text-rose-600', tileDark: 'dark:bg-rose-500/20 dark:text-rose-400',
    motion: 'float',
  },
  // PDF/Merge → red (PDF red)
  'merge-pdf': {
    cardLight: 'bg-red-50',          cardDark: 'dark:bg-red-950/40',
    tileLight: 'bg-red-100 text-red-600', tileDark: 'dark:bg-red-500/20 dark:text-red-400',
    motion: 'bounce',
  },
  // Image Upscaler → sky
  'image-upscaler': {
    cardLight: 'bg-sky-50',          cardDark: 'dark:bg-sky-950/40',
    tileLight: 'bg-sky-100 text-sky-600', tileDark: 'dark:bg-sky-500/20 dark:text-sky-400',
    motion: 'pulse',
  },
  // TikTok → slate/cyan
  'tiktok-video-downloader': {
    cardLight: 'bg-cyan-50',         cardDark: 'dark:bg-cyan-950/40',
    tileLight: 'bg-cyan-100 text-cyan-700', tileDark: 'dark:bg-cyan-500/20 dark:text-cyan-400',
    motion: 'float',
  },
  // AI → fuchsia/purple
  'ai-thumbnail-generator': {
    cardLight: 'bg-fuchsia-50',      cardDark: 'dark:bg-fuchsia-950/40',
    tileLight: 'bg-fuchsia-100 text-fuchsia-600', tileDark: 'dark:bg-fuchsia-500/20 dark:text-fuchsia-400',
    motion: 'pulse',
  },
  // Pinterest → rose
  'pinterest-image-downloader': {
    cardLight: 'bg-rose-50',         cardDark: 'dark:bg-rose-950/40',
    tileLight: 'bg-rose-100 text-rose-600', tileDark: 'dark:bg-rose-500/20 dark:text-rose-400',
    motion: 'bounce',
  },
  // Facebook → blue
  'facebook-video-downloader': {
    cardLight: 'bg-blue-50',         cardDark: 'dark:bg-blue-950/40',
    tileLight: 'bg-blue-100 text-blue-600', tileDark: 'dark:bg-blue-500/20 dark:text-blue-400',
    motion: 'float',
  },
  // Image Compressor → emerald
  'image-compressor': {
    cardLight: 'bg-emerald-50',      cardDark: 'dark:bg-emerald-950/40',
    tileLight: 'bg-emerald-100 text-emerald-600', tileDark: 'dark:bg-emerald-500/20 dark:text-emerald-400',
    motion: 'pulse',
  },
  // Instagram Reels → fuchsia
  'instagram-reels-downloader': {
    cardLight: 'bg-fuchsia-50',      cardDark: 'dark:bg-fuchsia-950/40',
    tileLight: 'bg-fuchsia-100 text-fuchsia-600', tileDark: 'dark:bg-fuchsia-500/20 dark:text-fuchsia-400',
    motion: 'float',
  },
  // PDF to Word → blue
  'pdf-to-word': {
    cardLight: 'bg-blue-50',         cardDark: 'dark:bg-blue-950/40',
    tileLight: 'bg-blue-100 text-blue-600', tileDark: 'dark:bg-blue-500/20 dark:text-blue-400',
    motion: 'bounce',
  },
  // Video Compressor → emerald
  'video-compressor': {
    cardLight: 'bg-emerald-50',      cardDark: 'dark:bg-emerald-950/40',
    tileLight: 'bg-emerald-100 text-emerald-600', tileDark: 'dark:bg-emerald-500/20 dark:text-emerald-400',
    motion: 'pulse',
  },
  // AI Caption → teal
  'ai-caption-generator': {
    cardLight: 'bg-teal-50',         cardDark: 'dark:bg-teal-950/40',
    tileLight: 'bg-teal-100 text-teal-600', tileDark: 'dark:bg-teal-500/20 dark:text-teal-400',
    motion: 'pulse',
  },
  // X (Twitter) → slate
  'x-video-downloader': {
    cardLight: 'bg-slate-100',       cardDark: 'dark:bg-slate-800/50',
    tileLight: 'bg-slate-200 text-slate-700', tileDark: 'dark:bg-slate-500/20 dark:text-slate-300',
    motion: 'float',
  },
  // QR Code → slate/indigo
  'qr-code-generator': {
    cardLight: 'bg-indigo-50',       cardDark: 'dark:bg-indigo-950/40',
    tileLight: 'bg-indigo-100 text-indigo-600', tileDark: 'dark:bg-indigo-500/20 dark:text-indigo-400',
    motion: 'spin-slow',
  },
};

// Fallback accent for any slug not explicitly listed
const FALLBACK_ACCENT: ToolAccent = {
  cardLight: 'bg-primary-light',     cardDark: 'dark:bg-primary/10',
  tileLight: 'bg-primary-light text-primary', tileDark: 'dark:bg-primary/20 dark:text-primary',
  motion: 'float',
};

// ---------------------------------------------------------------------------
// Framer Motion animation variants per style
// ---------------------------------------------------------------------------

const iconVariants: Record<MotionStyle, { animate: Record<string, number[]>; transition: object }> = {
  float: {
    animate: { y: [0, -6, 0] },
    transition: { duration: 3, ease: 'easeInOut', repeat: Infinity },
  },
  pulse: {
    animate: { scale: [1, 1.08, 1] },
    transition: { duration: 2.4, ease: 'easeInOut', repeat: Infinity },
  },
  'spin-slow': {
    animate: { rotate: [0, 360] },
    transition: { duration: 8, ease: 'linear', repeat: Infinity },
  },
  bounce: {
    animate: { y: [0, -5, 0] },
    transition: { duration: 1.6, ease: [0.36, 0, 0.66, -0.56], repeat: Infinity },
  },
};

// ---------------------------------------------------------------------------
// Animated icon wrapper
// ---------------------------------------------------------------------------

function AnimatedIcon({
  children,
  style,
  reduced,
}: {
  children: React.ReactNode;
  style: MotionStyle;
  reduced: boolean;
}) {
  const variant = iconVariants[style];
  return (
    <motion.div
      animate={reduced ? {} : variant.animate}
      transition={reduced ? {} : variant.transition}
      aria-hidden
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function MediaShowcase() {
  const t = useTranslation();
  const reduced = useReducedMotion() ?? false;

  return (
    <Section variant="default" id="showcase">
      <SectionHeading
        eyebrow={t('mediaShowcase.eyebrow')}
        title={t('mediaShowcase.title')}
        description={t('mediaShowcase.description')}
      />
      <div className="mt-16" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TOOL_SLUGS.map((slug) => {
          const tool = getCatalogTool(slug);
          if (!tool) return null;

          const Icon = tool.icon;
          const cta = t(`mediaShowcase.items.${slug}`);
          const accent = ACCENTS[slug] ?? FALLBACK_ACCENT;

          return (
            <Link
              key={slug}
              href={`/tools/${slug}`}
              className={[
                'group relative flex flex-col items-center justify-center',
                'aspect-square rounded-2xl overflow-hidden',
                'border border-border/50 dark:border-white/[0.06]',
                'shadow-soft hover:shadow-soft-lg',
                'transition-all duration-300 hover:-translate-y-1',
                'p-5',
                accent.cardLight,
                accent.cardDark,
              ].join(' ')}
              aria-label={tool.name}
            >
              {/* Large centered animated icon tile */}
              <div className="flex flex-col items-center gap-4 text-center">
                <div
                  className={[
                    'w-16 h-16 rounded-2xl flex items-center justify-center',
                    'transition-transform duration-300 group-hover:scale-105',
                    accent.tileLight,
                    accent.tileDark,
                  ].join(' ')}
                >
                  <AnimatedIcon style={accent.motion} reduced={reduced}>
                    <Icon className="w-8 h-8" aria-hidden />
                  </AnimatedIcon>
                </div>

                {/* Title */}
                <p className="text-[13px] sm:text-sm font-bold text-text leading-snug px-1 line-clamp-2">
                  {tool.name}
                </p>

                {/* CTA subtitle */}
                <p className="text-[11px] sm:text-xs text-text-muted leading-snug -mt-1 px-1">
                  {cta}
                </p>
              </div>

              {/* Bottom-right arrow — subtle by default, more visible on hover */}
              <div
                className={[
                  'absolute bottom-3 right-3',
                  'w-7 h-7 rounded-lg',
                  'flex items-center justify-center',
                  'bg-white/60 dark:bg-white/10',
                  'opacity-0 group-hover:opacity-100',
                  'translate-x-1 group-hover:translate-x-0',
                  'transition-all duration-200',
                ].join(' ')}
                aria-hidden
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-text" />
              </div>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
