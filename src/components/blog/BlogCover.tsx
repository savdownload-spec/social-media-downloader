import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import type { BlogPost } from '@/config/blog';

export function BlogCover({
  post,
  className = '',
  priority = false,
}: {
  post: Pick<BlogPost, 'coverImage' | 'coverAlt' | 'category' | 'title'>;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-gradient-brand-soft dark:bg-none dark:bg-card ${className}`}>
      {post.coverImage ? (
        <Image
          src={post.coverImage}
          alt={post.coverAlt || post.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 760px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-primary/50">
          <ImageOff className="h-8 w-8" aria-hidden="true" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/55 via-transparent to-transparent" />
      <span className="absolute left-4 top-4 inline-flex items-center rounded-full border border-white/30 bg-ink-950/45 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
        {post.category}
      </span>
    </div>
  );
}
