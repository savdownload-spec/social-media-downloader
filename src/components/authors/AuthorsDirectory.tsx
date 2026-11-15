'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Info, Search, SearchX, X } from 'lucide-react';
import type { PublicAuthor } from '@/lib/author-profile';
import { AuthorDirectoryCard } from '@/components/authors/AuthorDirectoryCard';

const PAGE_SIZE = 6;

type SortKey = 'name' | 'articles';

export function AuthorsDirectory({ authors }: { authors: PublicAuthor[] }) {
  const [query, setQuery] = useState('');
  const [expertise, setExpertise] = useState('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const expertiseOptions = useMemo(() => {
    const values = new Set<string>();
    for (const author of authors) for (const item of author.expertise) values.add(item);
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [authors]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = authors.filter((author) => {
      if (expertise !== 'all' && !author.expertise.includes(expertise)) return false;
      if (!needle) return true;
      return [author.name, author.role, author.shortBio ?? '', ...author.expertise]
        .some((value) => value.toLowerCase().includes(needle));
    });
    return matches.sort((a, b) =>
      sort === 'articles' ? b.articleCount - a.articleCount || a.name.localeCompare(b.name) : a.name.localeCompare(b.name),
    );
  }, [authors, query, expertise, sort]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, expertise, sort]);

  const activeFilters = query.trim() !== '' || expertise !== 'all' || sort !== 'name';
  const resetFilters = () => {
    setQuery('');
    setExpertise('all');
    setSort('name');
  };
  const shown = filtered.slice(0, visible);
  const hasSamples = authors.some((author) => author.isSample);

  if (!authors.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-white/70 px-6 py-16 text-center shadow-soft dark:bg-card/70">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-semibold text-text">No author profiles yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
          Author profiles will appear here as soon as they are published. In the meantime, explore the SavDown blog.
        </p>
        <Link
          href="/blog"
          className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-hover"
        >
          Read the blog
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-3xl border border-border bg-white/80 p-4 shadow-soft backdrop-blur dark:bg-card/80">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_190px]">
          <div className="relative">
            <label htmlFor="author-search" className="sr-only">
              Search authors
            </label>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" aria-hidden="true" />
            <input
              id="author-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, role, or expertise"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-10 text-sm text-text placeholder:text-text-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-text-subtle transition-colors hover:bg-primary-light hover:text-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div>
            <label htmlFor="author-expertise" className="sr-only">
              Filter by expertise
            </label>
            <select
              id="author-expertise"
              value={expertise}
              onChange={(event) => setExpertise(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All expertise</option>
              {expertiseOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="author-sort" className="sr-only">
              Sort authors
            </label>
            <select
              id="author-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="name">Sort: Name A–Z</option>
              <option value="articles">Sort: Most articles</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
          <p aria-live="polite" aria-atomic="true">
            Showing <span className="font-semibold text-text">{shown.length}</span> of{' '}
            <span className="font-semibold text-text">{filtered.length}</span>{' '}
            {filtered.length === 1 ? 'author' : 'authors'}
          </p>
          {activeFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      {hasSamples && (
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-subtle" aria-hidden="true" />
          Profiles marked <span className="font-semibold text-text">Sample</span> are demo content for testing and are excluded from search engines.
        </p>
      )}

      {shown.length > 0 ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((author, index) => (
            <AuthorDirectoryCard key={author.id} author={author} priority={index < 3} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-white/70 px-6 py-14 text-center shadow-soft dark:bg-card/70">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
            <SearchX className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold text-text">No authors match your filters</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
            Try a different name or expertise, or clear the filters to see every author.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-hover"
          >
            Clear filters
          </button>
        </div>
      )}

      {visible < filtered.length && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-text shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:bg-card"
          >
            Load more authors
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
