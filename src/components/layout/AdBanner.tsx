'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { Container } from './Container';

/**
 * Reserved horizontal ad slot shown just below the header on every page
 * except the homepage. Mobile gets its own compact size (320x100, a real IAB
 * mobile banner) rather than a squeezed-down leaderboard, the 970x250 unit
 * only ever renders at tablet/desktop widths, so labelling it that way on a
 * phone would be misleading. Styled as a premium placement opportunity, not
 * a broken/empty dev box.
 */
export function AdBanner() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  return (
    <div className="border-b border-border-light bg-surface">
      <Container className="py-3 md:py-5">
        <div className="relative overflow-hidden rounded-xl md:rounded-2xl border border-dashed border-primary/25 bg-gradient-brand-soft dark:bg-none dark:bg-card">
          <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_80%_100%_at_50%_0%,black,transparent)] pointer-events-none" />

          {/* Mobile: a deliberate portrait ad card (not a squeezed leaderboard).
              Label/icon top, headline centred in the middle, CTA bottom-right. */}
          <div className="relative flex sm:hidden min-h-[160px] flex-col px-5 py-5 text-left">
            {/* Top: advertisement label + icon */}
            <div className="flex items-center gap-2.5">
              <span className="inline-flex w-9 h-9 flex-shrink-0 rounded-xl bg-white dark:bg-card items-center justify-center shadow-soft-md">
                <Sparkles className="w-4 h-4 text-primary" />
              </span>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70">Advertisement</p>
            </div>

            {/* Middle: headline + size, vertically centred in the remaining space */}
            <div className="flex flex-1 flex-col justify-center py-3">
              <p className="text-base font-bold tracking-tight text-text">Advertise Here</p>
              <p className="mt-0.5 text-xs text-text-subtle">320 &times; 100 mobile banner</p>
            </div>

            {/* Bottom-right: CTA */}
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 self-end rounded-xl bg-gradient-brand px-3.5 py-2 text-xs font-semibold text-white shadow-soft active:scale-[0.98] transition-all"
            >
              Inquire <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Tablet/desktop: full 970x250-style leaderboard */}
          <div className="relative hidden sm:flex min-h-[130px] flex-row items-center justify-between gap-6 px-10 py-6 text-left">
            <div className="flex items-center gap-5">
              <span className="inline-flex w-11 h-11 flex-shrink-0 rounded-2xl bg-white dark:bg-card items-center justify-center shadow-soft-md">
                <Sparkles className="w-5 h-5 text-primary" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary/70">Advertisement</p>
                <p className="mt-1 text-lg font-bold text-text tracking-tight">
                  Advertise Your Brand Here
                </p>
                <p className="mt-0.5 text-sm text-text-muted">
                  Reach thousands of daily visitors with premium placement.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.98]"
              >
                Get This Spot <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <span className="text-xs text-text-subtle">970 &times; 250 leaderboard</span>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
