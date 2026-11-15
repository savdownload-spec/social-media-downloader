import Image from 'next/image';
import { authorInitials } from '@/lib/author-profile';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: { width: 40, height: 40, className: 'h-10 w-10 text-xs', sizes: '40px' },
  md: { width: 64, height: 64, className: 'h-16 w-16 text-lg', sizes: '64px' },
  lg: { width: 96, height: 96, className: 'h-24 w-24 text-2xl', sizes: '96px' },
  xl: {
    width: 160,
    height: 160,
    className: 'h-28 w-28 text-3xl sm:h-40 sm:w-40',
    sizes: '(max-width: 640px) 112px, 160px',
  },
} as const;

export function AuthorAvatar({
  author,
  size = 'md',
  shape = 'rounded-2xl',
  priority = false,
  className,
}: {
  author: { name: string; profileImage: string | null };
  size?: keyof typeof SIZES;
  shape?: 'rounded-2xl' | 'rounded-3xl' | 'rounded-full';
  priority?: boolean;
  className?: string;
}) {
  const dims = SIZES[size];

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-gradient-brand font-semibold text-white shadow-soft',
        shape,
        dims.className,
        className,
      )}
    >
      {author.profileImage ? (
        <Image
          src={author.profileImage}
          alt={`${author.name} profile photo`}
          width={dims.width}
          height={dims.height}
          sizes={dims.sizes}
          priority={priority}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{authorInitials(author.name)}</span>
      )}
    </span>
  );
}
