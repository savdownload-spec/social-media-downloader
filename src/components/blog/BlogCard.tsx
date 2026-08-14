import Link from 'next/link';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import type { BlogPost } from '@/config/blog';
import { BlogCover } from '@/components/blog/BlogCover';

export function BlogCard({ post, compact = false }: { post: BlogPost; compact?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group block overflow-hidden rounded-2xl border border-border bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-soft-lg ${compact ? '' : 'h-full'}`}
    >
      <BlogCover
        post={post}
        priority={!compact}
        className={compact ? 'aspect-[1.55]' : 'aspect-[1.75]'}
      />
      <div className="p-5 md:p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
          <span>{post.author}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {post.readingTime}
          </span>
        </div>
        <h3 className={`${compact ? 'text-lg' : 'text-xl'} mt-3 font-semibold leading-tight text-text transition-colors group-hover:text-primary`}>
          {post.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-muted">{post.excerpt}</p>
        <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
          Read article
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
