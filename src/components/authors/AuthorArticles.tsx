'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, FileText } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import { BlogCard } from '@/components/blog/BlogCard';

const PAGE_SIZE = 6;

export function AuthorArticles({ posts }: { posts: BlogPost[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  if (!posts.length) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-white/70 px-6 py-12 text-center shadow-soft dark:bg-card/70">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-display text-xl font-semibold text-text">No published articles yet</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
          This author has not published an article yet. Check back soon, or explore the latest SavDown guides.
        </p>
        <Link
          href="/blog"
          className="mt-5 inline-flex items-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text shadow-soft transition-colors hover:border-primary/30 hover:text-primary dark:bg-card"
        >
          Browse all articles
        </Link>
      </div>
    );
  }

  const shown = posts.slice(0, visible);

  return (
    <div>
      <div className="grid gap-6 sm:grid-cols-2">
        {shown.map((post) => (
          <BlogCard key={post.slug} post={post} compact />
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <p className="text-xs text-text-muted" aria-live="polite" aria-atomic="true">
          Showing <span className="font-semibold text-text">{shown.length}</span> of{' '}
          <span className="font-semibold text-text">{posts.length}</span>{' '}
          {posts.length === 1 ? 'article' : 'articles'}
        </p>
        {visible < posts.length && (
          <button
            type="button"
            onClick={() => setVisible((current) => current + PAGE_SIZE)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-text shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary dark:bg-card"
          >
            Load more articles
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
