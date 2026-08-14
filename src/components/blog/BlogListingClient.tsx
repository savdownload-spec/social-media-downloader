'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock3, Search, X } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import { formatDate } from '@/lib/utils';
import { BlogAdSlot } from '@/components/blog/BlogAdSlot';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogCover } from '@/components/blog/BlogCover';

export function BlogListingClient({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const categories = useMemo(() => ['All', ...Array.from(new Set(posts.map((post) => post.category)))], [posts]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return posts.filter((post) => {
      const categoryMatch = category === 'All' || post.category === category;
      const searchMatch = !normalized || [post.title, post.excerpt, post.category, ...post.tags]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
      return categoryMatch && searchMatch;
    });
  }, [category, posts, query]);

  const [featured, ...remaining] = filtered;

  return (
    <>
      <div className="mt-10 flex flex-col gap-4 border-y border-border py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="Filter by category">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${category === item ? 'bg-ink-900 text-white shadow-soft' : 'bg-white text-text-muted hover:bg-primary-light hover:text-primary'}`}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search articles"
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-9 text-sm text-text outline-none transition-shadow placeholder:text-text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10"
            aria-label="Search blog articles"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text" aria-label="Clear search">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      {featured ? (
        <>
          <Link
            href={`/blog/${featured.slug}`}
            className="group mt-10 grid overflow-hidden rounded-3xl border border-border bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-soft-lg md:grid-cols-[1.18fr_1fr]"
          >
            <BlogCover post={featured} priority className="aspect-[1.5] min-h-[280px] md:aspect-auto md:min-h-full" />
            <div className="flex flex-col justify-center p-7 md:p-10">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Featured guide</span>
              <h2 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-text transition-colors group-hover:text-primary md:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-4 text-base leading-7 text-text-muted">{featured.excerpt}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDate(new Date(featured.publishedAt))}</span>
                <span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" aria-hidden="true" />{featured.readingTime}</span>
              </div>
              <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Read the guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </div>
          </Link>

          <BlogAdSlot slot="TOP_BANNER" className="my-8" />

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">More to explore</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-text">Latest articles</h2>
            </div>
            <p className="text-sm text-text-muted">{filtered.length} article{filtered.length === 1 ? '' : 's'}</p>
          </div>

          {remaining.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {remaining.map((post) => <BlogCard key={post.slug} post={post} />)}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-text-muted">
              This is the only article matching the current filter.
            </div>
          )}
        </>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-text">No articles found</h2>
          <p className="mt-2 text-sm text-text-muted">Try another category or search term.</p>
          <button type="button" onClick={() => { setCategory('All'); setQuery(''); }} className="mt-5 text-sm font-semibold text-primary hover:text-primary-hover">
            Clear filters
          </button>
        </div>
      )}
    </>
  );
}
