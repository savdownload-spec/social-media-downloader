import { Container } from '@/components/layout/Container';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { platformBrand } from '@/config/platforms';
import { Play } from 'lucide-react';
import type { Platform } from '@/config/tools';

/**
 * Visual band showing the kind of content you can save. Deterministic photos
 * (via seeded picsum) keep the layout lively without shipping binary assets.
 */
const items: { seed: string; platform: Platform; ratio: string; label: string }[] = [
  { seed: 'savdown-travel', platform: 'youtube', ratio: 'aspect-[3/4]', label: 'Travel vlog' },
  { seed: 'savdown-food', platform: 'tiktok', ratio: 'aspect-square', label: 'Recipe reel' },
  { seed: 'savdown-street', platform: 'instagram', ratio: 'aspect-[4/5]', label: 'Street style' },
  { seed: 'savdown-nature', platform: 'pinterest', ratio: 'aspect-square', label: 'Nature pin' },
  { seed: 'savdown-city', platform: 'facebook', ratio: 'aspect-[4/5]', label: 'City tour' },
  { seed: 'savdown-sport', platform: 'x', ratio: 'aspect-[3/4]', label: 'Match clip' },
  { seed: 'savdown-music', platform: 'youtube', ratio: 'aspect-square', label: 'Music video' },
  { seed: 'savdown-art', platform: 'instagram', ratio: 'aspect-[4/5]', label: 'Art reel' },
];

export function MediaShowcase() {
  return (
    <section className="py-24">
      <Container>
        <div className="max-w-2xl mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
            Save anything
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
            Videos, Reels, Pins &amp; More —{' '}
            <span className="text-gradient">In Original Quality.</span>
          </h2>
          <p className="mt-3 text-text-muted leading-relaxed">
            From cinematic 4K vlogs to quick recipe reels, SavDown keeps every pixel and
            never adds a watermark.
          </p>
        </div>

        <div className="columns-2 md:columns-4 gap-4 [column-fill:_balance]">
          {items.map((item) => {
            const brand = platformBrand[item.platform];
            return (
              <div
                key={item.seed}
                className="group relative mb-4 break-inside-avoid rounded-2xl overflow-hidden border border-border shadow-soft hover:shadow-soft-lg transition-all duration-300"
              >
                <div className={`relative ${item.ratio} bg-surface`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://picsum.photos/seed/${item.seed}/500/700`}
                    alt={item.label}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                  <div className={`absolute top-3 left-3 w-8 h-8 rounded-lg ${brand.tile} flex items-center justify-center text-white shadow-soft`}>
                    <PlatformIcon platform={item.platform} className="w-4 h-4" />
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-11 h-11 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-soft-lg">
                      <Play className="w-4 h-4 text-text ml-0.5" />
                    </div>
                  </div>

                  <span className="absolute bottom-3 left-3 text-xs font-semibold text-white drop-shadow">
                    {item.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
