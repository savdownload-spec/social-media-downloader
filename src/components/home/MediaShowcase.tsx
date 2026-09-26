'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Section, SectionHeading } from '@/components/layout/Section';
import { getCatalogTool } from '@/config/catalog';
import { useTranslation } from '@/i18n';

/**
 * Tool slugs shown in this section — original order preserved.
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

type MotionStyle = 'float' | 'pulse' | 'spin-slow' | 'bounce';

/**
 * Inline SVG backgrounds — data URIs so there are zero network requests.
 * Each is a minimal repeating pattern relevant to its tool.
 * The 'currentColor' tokens are replaced with fixed hex values so they render
 * identically regardless of CSS context.
 *
 * Patterns are intentionally very sparse so they read as subtle texture,
 * not a busy illustration.
 */

// Play-button / video-frame grid — YouTube, TikTok, Facebook, X video
const BG_VIDEO = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='4' y='4' width='52' height='52' rx='8' fill='none' stroke='%23000' stroke-opacity='.06' stroke-width='1.5'/%3E%3Cpolygon points='24,18 24,42 42,30' fill='%23000' fill-opacity='.05'/%3E%3C/svg%3E")`;
const BG_VIDEO_DARK = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='4' y='4' width='52' height='52' rx='8' fill='none' stroke='%23fff' stroke-opacity='.07' stroke-width='1.5'/%3E%3Cpolygon points='24,18 24,42 42,30' fill='%23fff' fill-opacity='.06'/%3E%3C/svg%3E")`;

// Camera shutter / photo frame grid — Instagram, Pinterest photos
const BG_PHOTO = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='6' y='12' width='48' height='38' rx='6' fill='none' stroke='%23000' stroke-opacity='.06' stroke-width='1.5'/%3E%3Ccircle cx='30' cy='31' r='9' fill='none' stroke='%23000' stroke-opacity='.06' stroke-width='1.5'/%3E%3Crect x='22' y='6' width='16' height='8' rx='3' fill='none' stroke='%23000' stroke-opacity='.06' stroke-width='1.5'/%3E%3C/svg%3E")`;
const BG_PHOTO_DARK = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='6' y='12' width='48' height='38' rx='6' fill='none' stroke='%23fff' stroke-opacity='.07' stroke-width='1.5'/%3E%3Ccircle cx='30' cy='31' r='9' fill='none' stroke='%23fff' stroke-opacity='.07' stroke-width='1.5'/%3E%3Crect x='22' y='6' width='16' height='8' rx='3' fill='none' stroke='%23fff' stroke-opacity='.07' stroke-width='1.5'/%3E%3C/svg%3E")`;

// Stacked document lines — PDF, Word, merge
const BG_DOC = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='10' y='8' width='40' height='50' rx='5' fill='none' stroke='%23000' stroke-opacity='.07' stroke-width='1.5'/%3E%3Cline x1='18' y1='22' x2='42' y2='22' stroke='%23000' stroke-opacity='.07' stroke-width='1.5'/%3E%3Cline x1='18' y1='30' x2='42' y2='30' stroke='%23000' stroke-opacity='.07' stroke-width='1.5'/%3E%3Cline x1='18' y1='38' x2='34' y2='38' stroke='%23000' stroke-opacity='.07' stroke-width='1.5'/%3E%3C/svg%3E")`;
const BG_DOC_DARK = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='10' y='8' width='40' height='50' rx='5' fill='none' stroke='%23fff' stroke-opacity='.08' stroke-width='1.5'/%3E%3Cline x1='18' y1='22' x2='42' y2='22' stroke='%23fff' stroke-opacity='.08' stroke-width='1.5'/%3E%3Cline x1='18' y1='30' x2='42' y2='30' stroke='%23fff' stroke-opacity='.08' stroke-width='1.5'/%3E%3Cline x1='18' y1='38' x2='34' y2='38' stroke='%23fff' stroke-opacity='.08' stroke-width='1.5'/%3E%3C/svg%3E")`;

// Eraser / selection dots — background remover, upscaler
const BG_ERASE = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='4' y='4' width='52' height='52' rx='8' fill='none' stroke='%23000' stroke-dasharray='5 4' stroke-opacity='.07' stroke-width='1.5'/%3E%3Ccircle cx='30' cy='30' r='10' fill='none' stroke='%23000' stroke-dasharray='4 3' stroke-opacity='.07' stroke-width='1.5'/%3E%3C/svg%3E")`;
const BG_ERASE_DARK = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='4' y='4' width='52' height='52' rx='8' fill='none' stroke='%23fff' stroke-dasharray='5 4' stroke-opacity='.08' stroke-width='1.5'/%3E%3Ccircle cx='30' cy='30' r='10' fill='none' stroke='%23fff' stroke-dasharray='4 3' stroke-opacity='.08' stroke-width='1.5'/%3E%3C/svg%3E")`;

// Sparkle / star grid — AI tools
const BG_AI = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 8 L32 28 L52 30 L32 32 L30 52 L28 32 L8 30 L28 28 Z' fill='%23000' fill-opacity='.05'/%3E%3Ccircle cx='14' cy='14' r='2' fill='%23000' fill-opacity='.06'/%3E%3Ccircle cx='46' cy='14' r='2' fill='%23000' fill-opacity='.06'/%3E%3Ccircle cx='14' cy='46' r='2' fill='%23000' fill-opacity='.06'/%3E%3Ccircle cx='46' cy='46' r='2' fill='%23000' fill-opacity='.06'/%3E%3C/svg%3E")`;
const BG_AI_DARK = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 8 L32 28 L52 30 L32 32 L30 52 L28 32 L8 30 L28 28 Z' fill='%23fff' fill-opacity='.06'/%3E%3Ccircle cx='14' cy='14' r='2' fill='%23fff' fill-opacity='.07'/%3E%3Ccircle cx='46' cy='14' r='2' fill='%23fff' fill-opacity='.07'/%3E%3Ccircle cx='14' cy='46' r='2' fill='%23fff' fill-opacity='.07'/%3E%3Ccircle cx='46' cy='46' r='2' fill='%23fff' fill-opacity='.07'/%3E%3C/svg%3E")`;

// Compress arrows / minimize icon grid — compressors
const BG_COMPRESS = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 14 L26 26 M14 14 L22 14 M14 14 L14 22' fill='none' stroke='%23000' stroke-opacity='.07' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M46 46 L34 34 M46 46 L38 46 M46 46 L46 38' fill='none' stroke='%23000' stroke-opacity='.07' stroke-width='2' stroke-linecap='round'/%3E%3Crect x='20' y='20' width='20' height='20' rx='4' fill='none' stroke='%23000' stroke-opacity='.05' stroke-width='1.5'/%3E%3C/svg%3E")`;
const BG_COMPRESS_DARK = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M14 14 L26 26 M14 14 L22 14 M14 14 L14 22' fill='none' stroke='%23fff' stroke-opacity='.08' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M46 46 L34 34 M46 46 L38 46 M46 46 L46 38' fill='none' stroke='%23fff' stroke-opacity='.08' stroke-width='2' stroke-linecap='round'/%3E%3Crect x='20' y='20' width='20' height='20' rx='4' fill='none' stroke='%23fff' stroke-opacity='.06' stroke-width='1.5'/%3E%3C/svg%3E")`;

// QR code cell grid — QR generator
const BG_QR = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='6' y='6' width='20' height='20' rx='3' fill='none' stroke='%23000' stroke-opacity='.07' stroke-width='1.5'/%3E%3Crect x='34' y='6' width='20' height='20' rx='3' fill='none' stroke='%23000' stroke-opacity='.07' stroke-width='1.5'/%3E%3Crect x='6' y='34' width='20' height='20' rx='3' fill='none' stroke='%23000' stroke-opacity='.07' stroke-width='1.5'/%3E%3Crect x='11' y='11' width='10' height='10' rx='2' fill='%23000' fill-opacity='.05'/%3E%3Crect x='39' y='11' width='10' height='10' rx='2' fill='%23000' fill-opacity='.05'/%3E%3Crect x='11' y='39' width='10' height='10' rx='2' fill='%23000' fill-opacity='.05'/%3E%3Crect x='36' y='34' width='6' height='6' rx='1' fill='%23000' fill-opacity='.05'/%3E%3Crect x='44' y='34' width='6' height='6' rx='1' fill='%23000' fill-opacity='.05'/%3E%3Crect x='36' y='42' width='6' height='6' rx='1' fill='%23000' fill-opacity='.05'/%3E%3Crect x='44' y='42' width='6' height='6' rx='1' fill='%23000' fill-opacity='.05'/%3E%3C/svg%3E")`;
const BG_QR_DARK = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='6' y='6' width='20' height='20' rx='3' fill='none' stroke='%23fff' stroke-opacity='.08' stroke-width='1.5'/%3E%3Crect x='34' y='6' width='20' height='20' rx='3' fill='none' stroke='%23fff' stroke-opacity='.08' stroke-width='1.5'/%3E%3Crect x='6' y='34' width='20' height='20' rx='3' fill='none' stroke='%23fff' stroke-opacity='.08' stroke-width='1.5'/%3E%3Crect x='11' y='11' width='10' height='10' rx='2' fill='%23fff' fill-opacity='.06'/%3E%3Crect x='39' y='11' width='10' height='10' rx='2' fill='%23fff' fill-opacity='.06'/%3E%3Crect x='11' y='39' width='10' height='10' rx='2' fill='%23fff' fill-opacity='.06'/%3E%3Crect x='36' y='34' width='6' height='6' rx='1' fill='%23fff' fill-opacity='.06'/%3E%3Crect x='44' y='34' width='6' height='6' rx='1' fill='%23fff' fill-opacity='.06'/%3E%3Crect x='36' y='42' width='6' height='6' rx='1' fill='%23fff' fill-opacity='.06'/%3E%3Crect x='44' y='42' width='6' height='6' rx='1' fill='%23fff' fill-opacity='.06'/%3E%3C/svg%3E")`;

// Chat bubble / caption lines — AI caption
const BG_CAPTION = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='6' y='10' width='48' height='28' rx='8' fill='none' stroke='%23000' stroke-opacity='.06' stroke-width='1.5'/%3E%3Cpath d='M18 38 L14 50 L26 42' fill='none' stroke='%23000' stroke-opacity='.06' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cline x1='14' y1='20' x2='46' y2='20' stroke='%23000' stroke-opacity='.06' stroke-width='1.5'/%3E%3Cline x1='14' y1='28' x2='36' y2='28' stroke='%23000' stroke-opacity='.06' stroke-width='1.5'/%3E%3C/svg%3E")`;
const BG_CAPTION_DARK = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='6' y='10' width='48' height='28' rx='8' fill='none' stroke='%23fff' stroke-opacity='.07' stroke-width='1.5'/%3E%3Cpath d='M18 38 L14 50 L26 42' fill='none' stroke='%23fff' stroke-opacity='.07' stroke-width='1.5' stroke-linejoin='round'/%3E%3Cline x1='14' y1='20' x2='46' y2='20' stroke='%23fff' stroke-opacity='.07' stroke-width='1.5'/%3E%3Cline x1='14' y1='28' x2='36' y2='28' stroke='%23fff' stroke-opacity='.07' stroke-width='1.5'/%3E%3C/svg%3E")`;

interface ToolAccent {
  cardLight: string;
  cardDark: string;
  tileLight: string;
  tileDark: string;
  /** Inline SVG data URI for the card background texture (light mode). */
  bgLight: string;
  /** Inline SVG data URI for the card background texture (dark mode). */
  bgDark: string;
  motion: MotionStyle;
}

const ACCENTS: Record<string, ToolAccent> = {
  'youtube-video-downloader': {
    cardLight: 'bg-red-50',          cardDark: 'dark:bg-red-950/40',
    tileLight: 'bg-red-100 text-red-600', tileDark: 'dark:bg-red-500/20 dark:text-red-400',
    bgLight: BG_VIDEO,               bgDark: BG_VIDEO_DARK,
    motion: 'pulse',
  },
  'background-remover': {
    cardLight: 'bg-violet-50',       cardDark: 'dark:bg-violet-950/40',
    tileLight: 'bg-violet-100 text-violet-600', tileDark: 'dark:bg-violet-500/20 dark:text-violet-400',
    bgLight: BG_ERASE,               bgDark: BG_ERASE_DARK,
    motion: 'float',
  },
  'instagram-photo-downloader': {
    cardLight: 'bg-rose-50',         cardDark: 'dark:bg-rose-950/40',
    tileLight: 'bg-rose-100 text-rose-600', tileDark: 'dark:bg-rose-500/20 dark:text-rose-400',
    bgLight: BG_PHOTO,               bgDark: BG_PHOTO_DARK,
    motion: 'float',
  },
  'merge-pdf': {
    cardLight: 'bg-red-50',          cardDark: 'dark:bg-red-950/40',
    tileLight: 'bg-red-100 text-red-600', tileDark: 'dark:bg-red-500/20 dark:text-red-400',
    bgLight: BG_DOC,                 bgDark: BG_DOC_DARK,
    motion: 'bounce',
  },
  'image-upscaler': {
    cardLight: 'bg-sky-50',          cardDark: 'dark:bg-sky-950/40',
    tileLight: 'bg-sky-100 text-sky-600', tileDark: 'dark:bg-sky-500/20 dark:text-sky-400',
    bgLight: BG_ERASE,               bgDark: BG_ERASE_DARK,
    motion: 'pulse',
  },
  'tiktok-video-downloader': {
    cardLight: 'bg-cyan-50',         cardDark: 'dark:bg-cyan-950/40',
    tileLight: 'bg-cyan-100 text-cyan-700', tileDark: 'dark:bg-cyan-500/20 dark:text-cyan-400',
    bgLight: BG_VIDEO,               bgDark: BG_VIDEO_DARK,
    motion: 'float',
  },
  'ai-thumbnail-generator': {
    cardLight: 'bg-fuchsia-50',      cardDark: 'dark:bg-fuchsia-950/40',
    tileLight: 'bg-fuchsia-100 text-fuchsia-600', tileDark: 'dark:bg-fuchsia-500/20 dark:text-fuchsia-400',
    bgLight: BG_AI,                  bgDark: BG_AI_DARK,
    motion: 'pulse',
  },
  'pinterest-image-downloader': {
    cardLight: 'bg-rose-50',         cardDark: 'dark:bg-rose-950/40',
    tileLight: 'bg-rose-100 text-rose-600', tileDark: 'dark:bg-rose-500/20 dark:text-rose-400',
    bgLight: BG_PHOTO,               bgDark: BG_PHOTO_DARK,
    motion: 'bounce',
  },
  'facebook-video-downloader': {
    cardLight: 'bg-blue-50',         cardDark: 'dark:bg-blue-950/40',
    tileLight: 'bg-blue-100 text-blue-600', tileDark: 'dark:bg-blue-500/20 dark:text-blue-400',
    bgLight: BG_VIDEO,               bgDark: BG_VIDEO_DARK,
    motion: 'float',
  },
  'image-compressor': {
    cardLight: 'bg-emerald-50',      cardDark: 'dark:bg-emerald-950/40',
    tileLight: 'bg-emerald-100 text-emerald-600', tileDark: 'dark:bg-emerald-500/20 dark:text-emerald-400',
    bgLight: BG_COMPRESS,            bgDark: BG_COMPRESS_DARK,
    motion: 'pulse',
  },
  'instagram-reels-downloader': {
    cardLight: 'bg-fuchsia-50',      cardDark: 'dark:bg-fuchsia-950/40',
    tileLight: 'bg-fuchsia-100 text-fuchsia-600', tileDark: 'dark:bg-fuchsia-500/20 dark:text-fuchsia-400',
    bgLight: BG_VIDEO,               bgDark: BG_VIDEO_DARK,
    motion: 'float',
  },
  'pdf-to-word': {
    cardLight: 'bg-blue-50',         cardDark: 'dark:bg-blue-950/40',
    tileLight: 'bg-blue-100 text-blue-600', tileDark: 'dark:bg-blue-500/20 dark:text-blue-400',
    bgLight: BG_DOC,                 bgDark: BG_DOC_DARK,
    motion: 'bounce',
  },
  'video-compressor': {
    cardLight: 'bg-emerald-50',      cardDark: 'dark:bg-emerald-950/40',
    tileLight: 'bg-emerald-100 text-emerald-600', tileDark: 'dark:bg-emerald-500/20 dark:text-emerald-400',
    bgLight: BG_COMPRESS,            bgDark: BG_COMPRESS_DARK,
    motion: 'pulse',
  },
  'ai-caption-generator': {
    cardLight: 'bg-teal-50',         cardDark: 'dark:bg-teal-950/40',
    tileLight: 'bg-teal-100 text-teal-600', tileDark: 'dark:bg-teal-500/20 dark:text-teal-400',
    bgLight: BG_CAPTION,             bgDark: BG_CAPTION_DARK,
    motion: 'pulse',
  },
  'x-video-downloader': {
    cardLight: 'bg-slate-100',       cardDark: 'dark:bg-slate-800/50',
    tileLight: 'bg-slate-200 text-slate-700', tileDark: 'dark:bg-slate-500/20 dark:text-slate-300',
    bgLight: BG_VIDEO,               bgDark: BG_VIDEO_DARK,
    motion: 'float',
  },
  'qr-code-generator': {
    cardLight: 'bg-indigo-50',       cardDark: 'dark:bg-indigo-950/40',
    tileLight: 'bg-indigo-100 text-indigo-600', tileDark: 'dark:bg-indigo-500/20 dark:text-indigo-400',
    bgLight: BG_QR,                  bgDark: BG_QR_DARK,
    motion: 'spin-slow',
  },
};

const FALLBACK_ACCENT: ToolAccent = {
  cardLight: 'bg-primary-light',     cardDark: 'dark:bg-primary/10',
  tileLight: 'bg-primary-light text-primary', tileDark: 'dark:bg-primary/20 dark:text-primary',
  bgLight: BG_VIDEO,                 bgDark: BG_VIDEO_DARK,
  motion: 'float',
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const iconVariants: Record<MotionStyle, { animate: Record<string, number[]>; transition: object }> = {
  float:       { animate: { y: [0, -6, 0] },       transition: { duration: 3,   ease: 'easeInOut',   repeat: Infinity } },
  pulse:       { animate: { scale: [1, 1.08, 1] },  transition: { duration: 2.4, ease: 'easeInOut',   repeat: Infinity } },
  'spin-slow': { animate: { rotate: [0, 360] },      transition: { duration: 8,   ease: 'linear',      repeat: Infinity } },
  bounce:      { animate: { y: [0, -5, 0] },         transition: { duration: 1.6, ease: [0.36, 0, 0.66, -0.56], repeat: Infinity } },
};

function AnimatedIcon({ children, style, reduced }: { children: React.ReactNode; style: MotionStyle; reduced: boolean }) {
  const v = iconVariants[style];
  return (
    <motion.div animate={reduced ? {} : v.animate} transition={reduced ? {} : v.transition} aria-hidden>
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
              {/*
                SVG pattern background layer.
                Rendered as two absolutely-positioned divs (light + dark) so
                Tailwind's dark-mode class switching works correctly without
                runtime JS. Both are pointer-events-none and aria-hidden.
                The pattern is positioned at center/center and sized to 60px
                (matching the SVG viewBox) so it tiles neatly.
              */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: accent.bgLight,
                  backgroundSize: '60px 60px',
                  backgroundPosition: 'center center',
                }}
              />
              {/* Dark mode pattern — shown only when .dark is on <html> */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none hidden dark:block"
                style={{
                  backgroundImage: accent.bgDark,
                  backgroundSize: '60px 60px',
                  backgroundPosition: 'center center',
                }}
              />

              {/* Icon + text — sits above the pattern */}
              <div className="relative flex flex-col items-center gap-4 text-center z-10">
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

                <p className="text-[13px] sm:text-sm font-bold text-text leading-snug px-1 line-clamp-2">
                  {tool.name}
                </p>

                <p className="text-[11px] sm:text-xs text-text-muted leading-snug -mt-1 px-1">
                  {cta}
                </p>
              </div>

              {/* Bottom-right arrow */}
              <div
                className={[
                  'absolute bottom-3 right-3 z-10',
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
