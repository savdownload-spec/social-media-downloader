import Link from 'next/link';
import { ArrowUpRight, CalendarDays, Clock3 } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import { BlogCover } from '@/components/blog/BlogCover';
import { formatDate } from '@/lib/utils';

export function BlogCard({ post, compact = false }: { post: BlogPost; compact?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white dark:bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-soft-lg ${compact ? '' : ''}`}
    >
      <BlogCover post={post} priority={!compact} className={compact ? 'aspect-[1.55]' : 'aspect-[1.72]'} />
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{post.category}</p>
        <h3 className={`${compact ? 'text-lg' : 'text-xl'} mt-3 font-semibold leading-tight tracking-tight text-text transition-colors group-hover:text-primary`}>
          {post.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-muted">{post.excerpt}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border-light pt-4 text-xs text-text-muted">
          <span className="font-medium text-text">{post.author}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(new Date(post.publishedAt))}</span>
          <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" />{post.readingTime}</span>
        </div>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Read article <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}