import Link from 'next/link';
import { ArrowUpRight, Clock3, ListTree, Megaphone, Sparkles, Tag } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import type { BlogHeading } from '@/components/blog/BlogPostBody';
import { BlogAdSlot } from '@/components/blog/BlogAdSlot';
import { BlogPromoCard } from '@/components/blog/BlogPromoCard';
import { StickyArticleRail } from '@/components/blog/StickyArticleRail';
import { TableOfContents } from '@/components/blog/TableOfContents';

/**
 * House creative for the sidebar slot when no AdSense unit is configured.
 * It advertises the placement itself (linking to the real /contact request
 * flow) instead of leaving a blank reserved box or a fake advertiser ad.
 */
function HouseSidebarAd() {
  return (
    <div className="relative overflow-hidden bg-gradient-brand-soft px-4 py-6 text-center dark:bg-none dark:bg-card">
      <div className="absolute inset-0 bg-grid opacity-60" aria-hidden="true" />
      <div className="relative">
        <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-white shadow-soft dark:bg-surface">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-bold tracking-tight text-text">Advertise your brand here</p>
        <p className="mt-1 text-xs leading-5 text-text-muted">
          A premium sidebar placement in front of SavDown&apos;s reading audience.
        </p>
      </div>
    </div>
  );
}

export function BlogSidebar({ post, headings }: { post: BlogPost; headings: BlogHeading[] }) {
  return (
    <StickyArticleRail>
      {/* 1. On This Page — sticky table of contents */}
      {headings.length >= 2 && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold tracking-tight text-text">On this page</h2>
            <ListTree className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <TableOfContents headings={headings} mode="desktop" />
          <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-[11px] text-text-subtle">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {post.readingTime}
            </span>
            <span>{headings.length} sections</span>
          </div>
        </div>
      )}

      {/* 2. Advertisement — existing ad slot + house creative fallback */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-soft dark:bg-card">
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-subtle">Advertisement</span>
          <Megaphone className="h-3.5 w-3.5 text-text-subtle/70" aria-hidden="true" />
        </div>
        <BlogAdSlot
          slot="SIDEBAR_AD"
          slotId={process.env.NEXT_PUBLIC_ADSENSE_SIDEBAR_SLOT}
          fallback={<HouseSidebarAd />}
        />
        <div className="border-t border-border/70 px-4 py-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
          >
            Advertise on SavDown
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* 3. Existing promo + topic widgets (compact so the sticky rail never needs its own scrollbar) */}
      <BlogPromoCard post={post} />

      {post.tags.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft dark:bg-card">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            <Tag className="h-3.5 w-3.5" aria-hidden="true" /> Topics
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.slice(0, 6).map((tag) => (
              <span key={tag} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-text-muted">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </StickyArticleRail>
  );
}
