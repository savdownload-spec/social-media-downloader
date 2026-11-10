import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import type { BlogPost } from '@/config/blog';

// Intrinsic dimensions for each aspect ratio used across the site.
// These give the <img> explicit width/height attributes to prevent CLS;
// CSS (h-full w-full object-cover + the parent's aspect-ratio class)
// controls the actual rendered size while the attributes reserve space.
const DIMENSIONS = {
  'aspect-[1.55]': { w: 465, h: 300 },   // compact blog cards
  'aspect-[1.72]': { w: 1200, h: 697 },  // full blog cards
  'aspect-[16/8]': { w: 1200, h: 600 },  // blog post hero
};

function resolveDimensions(className: string) {
  for (const [ratio, dims] of Object.entries(DIMENSIONS)) {
    if (className.includes(ratio)) return dims;
  }
  return DIMENSIONS['aspect-[1.72]']; // safe default
}

export function BlogCover({
  post,
  className = '',
  priority = false,
}: {
  post: Pick<BlogPost, 'coverImage' | 'coverAlt' | 'category' | 'title'>;
  className?: string;
  priority?: boolean;
}) {
  const { w: width, h: height } = resolveDimensions(className);

  return (
    <div className={`relative overflow-hidden bg-gradient-brand-soft dark:bg-none dark:bg-card ${className}`}>
      {post.coverImage ? (
        <Image
          src={post.coverImage}
          alt={post.coverAlt || post.title}
          width={width}
          height={height}
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 760px, 1152px"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
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
