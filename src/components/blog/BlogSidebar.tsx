import Link from 'next/link';
import { ArrowUpRight, ListTree, Mail, Tag } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import type { BlogHeading } from '@/components/blog/BlogPostBody';
import { BlogAdSlot } from '@/components/blog/BlogAdSlot';
import { BlogPromoCard } from '@/components/blog/BlogPromoCard';

export function BlogSidebar({ post, headings, categories }: { post: BlogPost; headings: BlogHeading[]; categories: string[] }) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
      {headings.length >= 3 && (
        <nav aria-label="Table of contents" className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary"><ListTree className="h-4 w-4" /> In this guide</div>
          <ol className="mt-4 space-y-1.5">
            {headings.map((heading, index) => (
              <li key={heading.id}>
                <a href={`#${heading.id}`} className={`group flex gap-2 rounded-lg px-2 py-1.5 text-sm leading-5 text-text-muted transition-colors hover:bg-primary-light hover:text-primary ${heading.level === 3 ? 'pl-6 text-[13px]' : ''}`}>
                  <span className="shrink-0 font-semibold text-primary/75">{String(index + 1).padStart(2, '0')}</span><span>{heading.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Explore topics</p>
        <div className="mt-4 space-y-1.5">
          {categories.map((category) => (
            <Link key={category} href={`/blog?category=${encodeURIComponent(category)}`} className="group flex items-center justify-between rounded-xl px-3 py-2 text-sm text-text-muted transition-colors hover:bg-primary-light hover:text-primary">
              <span>{category}</span><ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-gradient-brand-soft p-5 shadow-soft">
        <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-text">Useful updates, not noise</h2>
        <p className="mt-2 text-sm leading-6 text-text-muted">Get practical downloader guides, creator workflows, and clear format tips in one thoughtful email.</p>
        <Link href="/blog#blog-newsletter" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover">Join the newsletter <ArrowUpRight className="h-4 w-4" /></Link>
      </div>
      <BlogPromoCard post={post} />
      {post.tags.length > 0 && (
        <div className="rounded-2xl border border-border bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"><Tag className="h-3.5 w-3.5" /> Topics</div>
          <div className="mt-4 flex flex-wrap gap-2">{post.tags.slice(0, 6).map((tag) => <span key={tag} className="rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-text-muted">{tag}</span>)}</div>
        </div>
      )}
      <BlogAdSlot slot="SIDEBAR_AD" />
    </aside>
  );
}