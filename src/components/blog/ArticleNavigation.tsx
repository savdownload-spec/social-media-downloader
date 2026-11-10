import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { BlogPost } from '@/config/blog';

type ArticleNavigationProps = {
  prevPost?: BlogPost | null;
  nextPost?: BlogPost | null;
};

export function ArticleNavigation({ prevPost, nextPost }: ArticleNavigationProps) {
  if (!prevPost && !nextPost) return null;

  return (
    <nav aria-label="Article navigation" className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {prevPost ? (
        <Link
          href={`/blog/${prevPost.slug}`}
          className="group flex flex-col gap-1 rounded-2xl border border-border bg-white dark:bg-card p-5 transition-all hover:border-primary/30 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
        >
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Previous
          </span>
          <span className="mt-1 text-sm font-semibold text-text line-clamp-2 group-hover:text-primary transition-colors">
            {prevPost.title}
          </span>
          <span className="text-xs text-text-muted">{prevPost.category}</span>
        </Link>
      ) : (
        <div />
      )}

      {nextPost ? (
        <Link
          href={`/blog/${nextPost.slug}`}
          className="group flex flex-col items-end gap-1 rounded-2xl border border-border bg-white dark:bg-card p-5 transition-all hover:border-primary/30 hover:shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 text-right"
          style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
        >
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted">
            Next <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="mt-1 text-sm font-semibold text-text line-clamp-2 group-hover:text-primary transition-colors">
            {nextPost.title}
          </span>
          <span className="text-xs text-text-muted">{nextPost.category}</span>
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
