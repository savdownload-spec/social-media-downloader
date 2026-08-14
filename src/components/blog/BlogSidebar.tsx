import Link from 'next/link';
import { ArrowUpRight, Mail, Tag } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import { BlogAdSlot } from '@/components/blog/BlogAdSlot';
import { BlogPromoCard } from '@/components/blog/BlogPromoCard';

export function BlogSidebar({ post, related }: { post: BlogPost; related: BlogPost[] }) {
  const categories = Array.from(new Set(related.map((item) => item.category).concat(post.category)));
  const tags = post.tags.slice(0, 5);

  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Explore the blog</p>
        <div className="mt-4 space-y-2">
          {categories.map((category) => (
            <Link
              key={category}
              href={`/blog?category=${encodeURIComponent(category)}`}
              className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm text-text-muted transition-colors hover:bg-primary-light hover:text-primary"
            >
              <span>{category}</span>
              <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-brand-soft p-5 shadow-soft">
        <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-text">Get the useful stuff</h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">Occasional guides for creators and practical downloader tips. No noisy inbox.</p>
        <Link
          href="/contact?subject=Blog%20newsletter"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
        >
          Join the newsletter
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <BlogPromoCard post={post} />

      {tags.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            <Tag className="h-3.5 w-3.5" aria-hidden="true" />
            In this article
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-text-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <BlogAdSlot slot="SIDEBAR_AD" />
    </aside>
  );
}
