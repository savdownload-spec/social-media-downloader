/**
 * Registry of non-downloader tools that have a live, working implementation.
 *
 * The router (`src/app/tools/[slug]/page.tsx`) consults this map *after* the
 * downloader registry (`toolsBySlug`) and *before* falling back to the
 * "Coming Soon" page. Each entry maps a catalog slug to the interactive
 * component that powers it.
 *
 * Adding a new live tool:
 *   1. Make sure it's in `catalog` (`src/config/catalog.ts`).
 *   2. Build a client component under `src/components/tools/`.
 *   3. Register it here with `getFunctionalTool(slug)` returning it.
 *
 * Architecture: Frontend → API Route → Service Layer → Library
 *   (Each tool component only talks to its own /api/tools/* route.)
 */
import type { ComponentType } from 'react';
import { ColorPickerTool } from '@/components/tools/ColorPickerTool';
import { GradientGeneratorTool } from '@/components/tools/GradientGeneratorTool';
import { ImageTool } from '@/components/tools/ImageTool';
import { VideoTool } from '@/components/tools/VideoTool';
import { PdfTool } from '@/components/tools/PdfTool';
import { QrGeneratorTool } from '@/components/tools/QrGeneratorTool';
import { QrScannerTool } from '@/components/tools/QrScannerTool';
import { SeoTool } from '@/components/tools/SeoTool';
import { AIImageGenerator } from '@/components/tools/AIImageGenerator';

/** Props every functional-tool component accepts. */
export type FunctionalToolProps = {
  /** The catalog slug driving this component (so one component can serve many). */
  slug: string;
};

export type FunctionalToolEntry = {
  /** The interactive component rendered inside the shared tool layout. */
  Component: ComponentType<FunctionalToolProps>;
};

/**
 * Map of slug → live tool. A single component instance (e.g. ImageTool) can
 * back many catalog slugs by branching on the `slug` prop it receives.
 */
const functionalTools: Record<string, FunctionalToolEntry> = {
  /* ── Image tools (Sharp) ─────────────────────────────────────── */
  'image-compressor':  { Component: ImageTool },
  'image-resizer':     { Component: ImageTool },
  'image-converter':   { Component: ImageTool },
  'image-enhancer':    { Component: ImageTool },
  'jpg-to-png':        { Component: ImageTool },
  'png-to-jpg':        { Component: ImageTool },
  'webp-converter':    { Component: ImageTool },
  'heic-to-jpg':       { Component: ImageTool },

  /* ── Video tools (FFmpeg) ────────────────────────────────────── */
  'video-converter':   { Component: VideoTool },
  'video-compressor':  { Component: VideoTool },
  'video-to-mp3':      { Component: VideoTool },
  'gif-maker':         { Component: VideoTool },
  'mp4-to-gif':        { Component: VideoTool },

  /* ── PDF tools (pdf-lib + Sharp) ─────────────────────────────── */
  'merge-pdf':         { Component: PdfTool },
  'split-pdf':         { Component: PdfTool },
  'compress-pdf':      { Component: PdfTool },
  'jpg-to-pdf':        { Component: PdfTool },
  'pdf-to-jpg':        { Component: PdfTool },

  /* ── QR tools (qrcode + jsqr) ────────────────────────────────── */
  'qr-code-generator': { Component: QrGeneratorTool },
  'qr-code-scanner':   { Component: QrScannerTool },

  /* ── Utility tools (client-only) ─────────────────────────────── */
  'color-picker':      { Component: ColorPickerTool },
  'gradient-generator':{ Component: GradientGeneratorTool },

  /* ── SEO tools (local templates/logic, client-only) ──────────── */
  'meta-title-generator':       { Component: SeoTool },
  'meta-description-generator': { Component: SeoTool },
  'youtube-tags-generator':     { Component: SeoTool },
  'keyword-generator':          { Component: SeoTool },
  'schema-generator':           { Component: SeoTool },

  /* ── AI tools (Cloudflare Workers AI) ────────────────────────── */
  'ai-image-generator': { Component: AIImageGenerator },
};

/** Returns the live tool entry for a slug, or undefined if it isn't built yet. */
export function getFunctionalTool(slug: string): FunctionalToolEntry | undefined {
  return functionalTools[slug];
}

/** True when this slug has a live functional implementation. */
export function isFunctionalTool(slug: string): boolean {
  return slug in functionalTools;
}

/** All slugs that have a live functional implementation. */
export const functionalToolSlugs = Object.keys(functionalTools);
