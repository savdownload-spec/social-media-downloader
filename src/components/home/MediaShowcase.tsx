import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { getCatalogTool } from '@/config/catalog';

/**
 * Visual band showing what the toolkit actually does, across categories, not
 * just video downloads. Each tile is a real catalog tool: its own icon, name,
 * and a link straight to that tool's page. A uniform grid (equal aspect ratio
 * per cell) keeps every row level, unlike a masonry layout. Deterministic
 * photos (via seeded picsum) keep the layout lively without shipping assets.
 */
const items: { slug: string; seed: string; cta: string }[] = [
  { slug: 'youtube-video-downloader', seed: 'savdown-travel', cta: 'Download video' },
  { slug: 'background-remover', seed: 'savdown-portrait', cta: 'Remove background' },
  { slug: 'instagram-photo-downloader', seed: 'savdown-street', cta: 'Save photo' },
  { slug: 'merge-pdf', seed: 'savdown-desk', cta: 'Combine files' },
  { slug: 'image-upscaler', seed: 'savdown-nature', cta: 'Upscale image' },
  { slug: 'tiktok-video-downloader', seed: 'savdown-food', cta: 'Download video' },
  { slug: 'ai-thumbnail-generator', seed: 'savdown-city', cta: 'Generate with AI' },
  { slug: 'pinterest-image-downloader', seed: 'savdown-art', cta: 'Save image' },
  { slug: 'facebook-video-downloader', seed: 'savdown-crowd', cta: 'Download video' },
  { slug: 'image-compressor', seed: 'savdown-mountain', cta: 'Compress image' },
  { slug: 'instagram-reels-downloader', seed: 'savdown-dance', cta: 'Download reel' },
  { slug: 'pdf-to-word', seed: 'savdown-office', cta: 'Convert PDF' },
  { slug: 'video-compressor', seed: 'savdown-beach', cta: 'Compress video' },
  { slug: 'ai-caption-generator', seed: 'savdown-coffee', cta: 'Generate with AI' },
  { slug: 'x-video-downloader', seed: 'savdown-skyline', cta: 'Download video' },
  { slug: 'qr-code-generator', seed: 'savdown-market', cta: 'Create QR code' },
];

export function MediaShowcase() {
  return (
    <Section variant="default" id="showcase">
      <SectionHeading
        eyebrow="See it in action"
        title={
          <>
            One Toolkit, <span className="text-gradient">Endless Ways To Use It.</span>
          </>
        }
        description="From saving a video to cleaning up an image or merging a PDF, every tool is one click away. Tap any example to open its tool."
      />
      <div className="mt-16" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((item) => {
          const tool = getCatalogTool(item.slug);
          if (!tool) return null;
          const Icon = tool.icon;
          return (
            <Link
              key={item.slug}
              href={`/tools/${item.slug}`}
              className="group relative block aspect-square rounded-2xl overflow-hidden border border-border shadow-soft hover:shadow-soft-lg transition-all duration-300"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://picsum.photos/seed/${item.seed}/500/500`}
                alt={tool.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

              <span className={`absolute top-3 left-3 w-8 h-8 rounded-lg ${tool.tile} flex items-center justify-center shadow-soft`}>
                <Icon className="w-4 h-4" />
              </span>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-11 h-11 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-soft-lg">
                  <ArrowUpRight className="w-4 h-4 text-text" />
                </div>
              </div>

              <div className="absolute bottom-0 inset-x-0 p-3">
                <span className="block text-xs font-semibold text-white drop-shadow truncate">
                  {tool.name}
                </span>
                <span className="block text-[11px] text-white/75 drop-shadow">
                  {item.cta}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
