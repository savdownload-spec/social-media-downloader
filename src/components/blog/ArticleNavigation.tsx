import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Clock3 } from 'lucide-react';
import type { BlogPost } from '@/config/blog';

type ArticleNavigationProps = {
  prevPost?: BlogPost | null;
  nextPost?: BlogPost | null;
};

function NavCard({ post, direction }: { post: BlogPost; direction: 'prev' | 'next' }) {
  const isPrev = direction === 'prev';
  const Arrow = isPrev ? ArrowLeft : ArrowRight;

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group relative flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft-lg focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-card sm:p-5 ${
        isPrev ? '' : 'flex-row-reverse text-right'
      }`}
      style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />

      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border/70 sm:h-[72px] sm:w-[72px]">
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt=""
            fill
            sizes="72px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-brand-soft text-primary" aria-hidden="true">
            <Arrow className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className={`relative flex min-w-0 flex-1 flex-col ${isPrev ? 'items-start' : 'items-end'}`}>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-text-subtle transition-colors group-hover:text-primary">
          {isPrev && <Arrow className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden="true" />}
          {isPrev ? 'Previous guide' : 'Next guide'}
          {!isPrev && <Arrow className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />}
        </span>
        <span className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-text transition-colors group-hover:text-primary sm:text-[15px]">
          {post.title}
        </span>
        <span className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
          <span className="rounded-full bg-surface px-2.5 py-0.5 font-medium text-text-muted">{post.category}</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" aria-hidden="true" />
            {post.readingTime}
          </span>
        </span>
      </div>
    </Link>
  );
}

export function ArticleNavigation({ prevPost, nextPost }: ArticleNavigationProps) {
  if (!prevPost && !nextPost) return null;

  return (
    <nav aria-label="Article navigation" className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {prevPost ? <NavCard post={prevPost} direction="prev" /> : <div className="hidden sm:block" />}
      {nextPost ? <NavCard post={nextPost} direction="next" /> : <div className="hidden sm:block" />}
    </nav>
  );
}
