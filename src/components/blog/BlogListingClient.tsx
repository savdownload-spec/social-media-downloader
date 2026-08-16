'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, CalendarDays, Clock3, Search, Sparkles, X } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import { BlogAdSlot } from '@/components/blog/BlogAdSlot';
import { BlogCard } from '@/components/blog/BlogCard';
import { BlogCover } from '@/components/blog/BlogCover';
import { Newsletter } from '@/components/home/Newsletter';
import { formatDate } from '@/lib/utils';

export function BlogListingClient({ posts }: { posts: BlogPost[] }) {
  const searchParams = useSearchParams();
  const [category, setCategory] = useState(() => searchParams.get('category') ?? 'All');
  const [query, setQuery] = useState('');
  const categories = useMemo(() => ['All', ...Array.from(new Set(posts.map((post) => post.category)))], [posts]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return posts.filter((post) => {
      const categoryMatch = category === 'All' || post.category === category;
      const searchMatch = !normalized || [post.title, post.excerpt, post.author, post.category, ...post.tags].join(' ').toLowerCase().includes(normalized);
      return categoryMatch && searchMatch;
    });
  }, [category, posts, query]);
  const featured = filtered[0];
  const spotlight = filtered.slice(1, 3);
  const latest = filtered.slice(3);

  return (
    <div>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-white dark:bg-card p-4 shadow-soft lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="Filter by category">
          {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${category === item ? 'bg-ink-900 text-white shadow-soft' : 'bg-surface text-text-muted hover:bg-primary-light hover:text-primary'}`}>{item}</button>)}
        </div>
        <label className="relative block w-full lg:w-72"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search articles" className="w-full rounded-xl border border-border bg-white dark:bg-card py-2.5 pl-10 pr-9 text-sm text-text outline-none transition-shadow placeholder:text-text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10" aria-label="Search blog articles" />{query && <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text" aria-label="Clear search"><X className="h-4 w-4" /></button>}</label>
      </div>

      {featured ? <>
        <section className="mt-10" aria-labelledby="featured-article-title">
          <div className="mb-5 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Featured guide</p></div>
          <Link href={`/blog/${featured.slug}`} className="group grid overflow-hidden rounded-3xl border border-border bg-white dark:bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-soft-lg md:grid-cols-[1.12fr_1fr]">
            <BlogCover post={featured} priority className="aspect-[1.45] min-h-[280px] md:aspect-auto md:min-h-full" />
            <div className="flex flex-col justify-center p-7 md:p-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{featured.category}</p><h2 id="featured-article-title" className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-text transition-colors group-hover:text-primary md:text-3xl">{featured.title}</h2><p className="mt-4 text-base leading-7 text-text-muted">{featured.excerpt}</p><div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted"><span className="font-medium text-text">{featured.author}</span><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatDate(new Date(featured.publishedAt))}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="h-4 w-4" />{featured.readingTime}</span></div><span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-primary">Read the guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div>
          </Link>
        </section>

        {spotlight.length > 0 && <section className="mt-12" aria-labelledby="featured-content-title"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Selected for you</p><h2 id="featured-content-title" className="mt-2 text-2xl font-semibold tracking-tight text-text">Featured content</h2></div><p className="text-sm text-text-muted">{filtered.length} article{filtered.length === 1 ? '' : 's'}</p></div><div className="mt-6 grid gap-5 md:grid-cols-2">{spotlight.map((post) => <BlogCard key={post.slug} post={post} />)}</div></section>}

        <BlogAdSlot slot="TOP_BANNER" className="my-8" />

        <section className="mt-12" aria-labelledby="latest-articles-title"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Keep learning</p><h2 id="latest-articles-title" className="mt-2 text-2xl font-semibold tracking-tight text-text">Latest articles</h2></div><p className="hidden text-sm text-text-muted sm:block">Practical guides for real media workflows.</p></div>{latest.length > 0 ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{latest.map((post) => <BlogCard key={post.slug} post={post} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-border bg-white dark:bg-card p-8 text-center text-sm text-text-muted">This is the only article matching the current filter.</div>}</section>

        <section className="mt-14 rounded-3xl border border-border bg-gradient-brand-soft dark:bg-none dark:bg-card p-7 md:p-10" aria-labelledby="topic-discovery-title"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Explore by topic</p><h2 id="topic-discovery-title" className="mt-3 text-2xl font-semibold tracking-tight text-text">Start with the platform or workflow that matters now.</h2><p className="mt-3 text-sm leading-6 text-text-muted">Browse the categories already used across SavDown’s editorial library.</p></div><div className="mt-7 flex flex-wrap gap-3">{categories.filter((item) => item !== 'All').map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className="rounded-full border border-primary/15 bg-white dark:bg-card px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:border-primary/30 hover:text-primary">{item}</button>)}</div></section>

        <div id="blog-newsletter" className="scroll-mt-24"><Newsletter /></div>
        <section className="mb-2 rounded-3xl bg-ink px-7 py-10 text-white shadow-soft-lg md:px-10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">One link, less friction</p><h2 className="mt-3 max-w-2xl text-2xl font-semibold tracking-tight md:text-3xl">Turn the next guide into an easier media workflow.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/70">SavDown brings downloading, conversion, and creator tools together in a clean browser experience.</p><Link href="/tools" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition-colors hover:bg-primary-light">Explore SavDown tools <ArrowRight className="h-4 w-4" /></Link></section>
      </> : <div className="mt-10 rounded-2xl border border-dashed border-border bg-white dark:bg-card p-10 text-center"><h2 className="text-lg font-semibold text-text">No articles found</h2><p className="mt-2 text-sm text-text-muted">Try another category or search term.</p><button type="button" onClick={() => { setCategory('All'); setQuery(''); }} className="mt-5 text-sm font-semibold text-primary hover:text-primary-hover">Clear filters</button></div>}
    </div>
  );
}