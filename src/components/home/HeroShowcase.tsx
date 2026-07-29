import { Play, Download, Check, Lock } from 'lucide-react';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { platformBrand } from '@/config/platforms';
import type { Platform } from '@/config/tools';

type Props = {
  platform?: Platform;
  title?: string;
  author?: string;
  seed?: string;
  floating?: boolean;
};

/**
 * Editorial hero visual — a floating "app window" product preview that shows
 * a finished download so the value is obvious at a glance. The thumbnail is a
 * real (deterministic) image so the mockup never looks empty. Reused on tool
 * pages via props so each platform gets a matching preview.
 */
export function HeroShowcase({
  platform = 'tiktok',
  title = 'Golden hour sunset timelapse — 4K',
  author = '@creator.studio · 0:42',
  seed = 'savdown-hero',
  floating = true,
}: Props) {
  const brand = platformBrand[platform];
  return (
    <div className="relative mx-auto max-w-3xl mt-16 md:mt-20">
      {/* glow */}
      <div className="absolute -inset-6 bg-gradient-brand opacity-20 blur-3xl rounded-[40px] pointer-events-none" />

      <div className="relative rounded-3xl bg-white border border-border shadow-soft-xl overflow-hidden">
        {/* browser chrome */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border-light bg-surface/60">
          <span className="w-3 h-3 rounded-full bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          <span className="w-3 h-3 rounded-full bg-green-400" />
          <div className="ml-3 flex-1 max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-text-muted bg-white border border-border-light rounded-full py-1.5 px-3">
              <Lock className="w-3 h-3 text-accent" />
              savdown.com
            </div>
          </div>
        </div>

        {/* result card */}
        <div className="p-5 md:p-6">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="relative w-full sm:w-56 aspect-video rounded-2xl overflow-hidden bg-surface flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://picsum.photos/seed/${seed}/560/320`}
                alt="Downloaded video preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-soft-lg">
                  <Play className="w-5 h-5 text-text ml-0.5" />
                </div>
              </div>
              <div className={`absolute top-2.5 left-2.5 w-7 h-7 rounded-lg ${brand.tile} flex items-center justify-center text-white shadow-soft`}>
                <PlatformIcon platform={platform} className="w-4 h-4" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-light text-accent-hover text-xs font-semibold">
                <Check className="w-3.5 h-3.5" /> Ready to download
              </div>
              <h3 className="mt-3 font-bold text-text leading-snug">
                {title}
              </h3>
              <p className="mt-1 text-sm text-text-muted">by {author}</p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { l: 'MP4 1080p', s: '24.6 MB', primary: true },
                  { l: 'MP4 720p', s: '11.2 MB' },
                  { l: 'MP3 audio', s: '3.1 MB' },
                  { l: 'GIF', s: '1.8 MB' },
                ].map((f) => (
                  <div
                    key={f.l}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-sm font-medium ${
                      f.primary
                        ? 'text-white bg-gradient-brand shadow-glow-lg'
                        : 'text-text bg-surface border border-border-light'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Download className={`w-3.5 h-3.5 ${f.primary ? 'text-white' : 'text-text-muted'}`} />
                      {f.l}
                    </span>
                    <span className={f.primary ? 'text-white/70 text-xs' : 'text-text-subtle text-xs'}>{f.s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating accent chips */}
      {floating && (
      <>
      <div className="hidden md:flex absolute -left-6 top-24 items-center gap-2 px-3 py-2 rounded-2xl bg-white border border-border shadow-soft-lg animate-float">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white">
          <PlatformIcon platform="youtube" className="w-4 h-4" />
        </span>
        <span className="text-xs font-semibold text-text">No watermark</span>
      </div>
      <div className="hidden md:flex absolute -right-5 bottom-16 items-center gap-2 px-3 py-2 rounded-2xl bg-white border border-border shadow-soft-lg animate-float" style={{ animationDelay: '1.5s' }}>
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white">
          <PlatformIcon platform="instagram" className="w-4 h-4" />
        </span>
        <span className="text-xs font-semibold text-text">HD quality</span>
      </div>
      </>
      )}
    </div>
  );
}
