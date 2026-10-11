'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowUpRight, Search as SearchIcon } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Input } from '@/components/ui/Input';
import { search } from '@/lib/search/search';
import type { SearchResult } from '@/lib/search/types';

function categoryLabel(result: SearchResult): string {
  if (result.type === 'tool') return result.category ? `${result.category} Tool` : 'Tool';
  if (result.type === 'blog') return result.category ? `Blog · ${result.category}` : 'Blog';
  return result.category || result.type.charAt(0).toUpperCase() + result.type.slice(1);
}

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  // Track latest request to discard stale responses
  const requestIdRef = useRef(0);

  // Sync query from URL on mount / navigation
  useEffect(() => {
    const value = params.get('q');
    if (value) setQuery(value);
  }, [params]);

  // Run search whenever query changes
  useEffect(() => {
    const normalized = query.trim();

    if (normalized.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestIdRef.current;

    (async () => {
      try {
        const r = await search(normalized);
        // Ignore stale responses
        if (id === requestIdRef.current) {
          setResults(r);
        }
      } finally {
        if (id === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();
  }, [query]);

  // Split results into tool group and everything else for cosmetic grouping
  const toolResults = results.filter((r) => r.type === 'tool');
  const otherResults = results.filter((r) => r.type !== 'tool');
  const hasGrouping = query.trim().length >= 2 && toolResults.length > 0 && otherResults.length > 0;

  const renderCard = (item: SearchResult) => (
    <Link
      key={item.url}
      href={item.url}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-white dark:bg-card p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {categoryLabel(item)}
          </span>
        </div>
        <h2 className="truncate font-semibold text-text transition-colors group-hover:text-primary">
          {item.title}
        </h2>
        <p className="mt-0.5 truncate text-sm text-text-muted">{item.description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-text-muted" aria-hidden="true" />
    </Link>
  );

  return (
    <>
      <div className="relative mt-8">
        <SearchIcon
          className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            router.replace(
              event.target.value
                ? `/search?q=${encodeURIComponent(event.target.value)}`
                : '/search',
              { scroll: false }
            );
          }}
          placeholder="Type to search tools, articles, or topics…"
          autoFocus
          className="pl-12 text-base"
          aria-label="Search"
        />
      </div>

      {loading ? (
        <div className="mt-8 h-14 animate-pulse rounded-2xl bg-surface" />
      ) : (
        <>
          <p className="mt-6 text-sm text-text-muted">
            {results.length} result{results.length === 1 ? '' : 's'}
            {query && (
              <>
                {' '}for <span className="text-text">&quot;{query}&quot;</span>
              </>
            )}
          </p>

          <div className="mt-6 space-y-3">
            {hasGrouping ? (
              <>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Tools
                </h3>
                {toolResults.map(renderCard)}
                <h3 className="pt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Articles &amp; Pages
                </h3>
                {otherResults.map(renderCard)}
              </>
            ) : (
              results.map(renderCard)
            )}

            {results.length === 0 && query.trim().length >= 2 && (
              <div className="rounded-2xl bg-surface p-12 text-center">
                <p className="text-text-muted">Nothing matches that search.</p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <Container className="max-w-3xl py-24">
      <Breadcrumb
        className="mb-8"
        includeSchema
        items={[
          { label: 'Home', href: '/' },
          { label: 'Search' },
        ]}
      />
      <p className="mb-3 text-sm font-medium text-primary">Search</p>
      <h1 className="text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
        Find Anything On SavDown.
      </h1>
      <Suspense fallback={<div className="mt-8 h-14 animate-pulse rounded-2xl bg-surface" />}>
        <SearchInner />
      </Suspense>
    </Container>
  );
}
