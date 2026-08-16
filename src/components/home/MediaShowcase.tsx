'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { getCatalogTool } from '@/config/catalog';
import { useTranslation } from '@/i18n';

const itemSeeds: { slug: string; seed: string }[] = [
  { slug: 'youtube-video-downloader', seed: 'savdown-travel' },
  { slug: 'background-remover', seed: 'savdown-portrait' },
  { slug: 'instagram-photo-downloader', seed: 'savdown-street' },
  { slug: 'merge-pdf', seed: 'savdown-desk' },
  { slug: 'image-upscaler', seed: 'savdown-nature' },
  { slug: 'tiktok-video-downloader', seed: 'savdown-food' },
  { slug: 'ai-thumbnail-generator', seed: 'savdown-city' },
  { slug: 'pinterest-image-downloader', seed: 'savdown-art' },
  { slug: 'facebook-video-downloader', seed: 'savdown-crowd' },
  { slug: 'image-compressor', seed: 'savdown-mountain' },
  { slug: 'instagram-reels-downloader', seed: 'savdown-dance' },
  { slug: 'pdf-to-word', seed: 'savdown-office' },
  { slug: 'video-compressor', seed: 'savdown-beach' },
  { slug: 'ai-caption-generator', seed: 'savdown-coffee' },
  { slug: 'x-video-downloader', seed: 'savdown-skyline' },
  { slug: 'qr-code-generator', seed: 'savdown-market' },
];

export function MediaShowcase() {
  const t = useTranslation();

  return (
    <Section variant="default" id="showcase">
      <SectionHeading
        eyebrow={t('mediaShowcase.eyebrow')}
        title={t('mediaShowcase.title')}
        description={t('mediaShowcase.description')}
      />
      <div className="mt-16" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {itemSeeds.map((item) => {
          const tool = getCatalogTool(item.slug);
          if (!tool) return null;
          const Icon = tool.icon;
          const cta = t(`mediaShowcase.items.${item.slug}`);
          const iconColor = tool.tile.split(' ').filter((c) => c.includes('text-')).join(' ');

          return (
            <Link
              key={item.slug}
              href={`/tools/${item.slug}`}
              className="group relative block aspect-square rounded-2xl overflow-hidden border border-border shadow-soft hover:shadow-soft-lg transition-all duration-300"
            >
              <img
                src={`https://picsum.photos/seed/${item.seed}/500/500`}
                alt={tool.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />

              <span className={`absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/90 dark:bg-black/50 backdrop-blur flex items-center justify-center shadow-soft ${iconColor}`}>
                <Icon className="w-4 h-4" />
              </span>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-11 h-11 rounded-full bg-white/90 dark:bg-card/90 backdrop-blur flex items-center justify-center shadow-soft-lg">
                  <ArrowUpRight className="w-4 h-4 text-text" />
                </div>
              </div>

              <div className="absolute bottom-0 inset-x-0 p-3">
                <span className="block text-xs font-semibold text-white drop-shadow truncate">
                  {tool.name}
                </span>
                <span className="block text-[11px] text-white/75 drop-shadow">
                  {cta}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
