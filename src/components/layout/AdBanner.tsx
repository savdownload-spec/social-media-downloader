'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { Container } from './Container';

/**
 * Reserved horizontal ad slot shown just below the header on every page
 * except the homepage. Sized to the industry-standard 970x250 leaderboard so
 * it can be swapped for a real ad unit without reflowing the page. Styled as
 * a premium placement opportunity, not a broken/empty dev box.
 */
export function AdBanner() {
  const pathname = usePathname();
  if (pathname === '/') return null;

  return (
    <div className="border-b border-border-light bg-surface">
      <Container className="py-4 md:py-5">
        <div className="relative overflow-hidden rounded-2xl border border-dashed border-primary/25 bg-gradient-brand-soft">
          <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_80%_100%_at_50%_0%,black,transparent)] pointer-events-none" />
          <div className="relative flex min-h-[110px] md:min-h-[130px] flex-col md:flex-row items-center justify-center md:justify-between gap-3 md:gap-6 px-6 md:px-10 py-6 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-center gap-3 md:gap-5">
              <span className="inline-flex w-11 h-11 flex-shrink-0 rounded-2xl bg-white items-center justify-center shadow-soft-md">
                <Sparkles className="w-5 h-5 text-primary" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary/70">Advertisement</p>
                <p className="mt-1 text-base md:text-lg font-bold text-text tracking-tight">
                  Advertise Your Brand Here
                </p>
                <p className="mt-0.5 text-sm text-text-muted">
                  Reach thousands of daily visitors with premium placement.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-2 flex-shrink-0">
              <Link
                href="/contact"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-brand shadow-soft hover:shadow-soft-md transition-shadow"
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
