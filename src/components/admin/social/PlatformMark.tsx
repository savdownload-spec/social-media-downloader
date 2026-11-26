'use client';

import { cn } from '@/lib/utils';
import { getPlatform } from '@/lib/social/platforms';

export function PlatformMark({
  platform,
  size = 'md',
  className,
  title,
}: {
  platform: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}) {
  const def = getPlatform(platform);
  const sizes = {
    xs: 'w-5 h-5 text-[9px] rounded-md',
    sm: 'w-6 h-6 text-[10px] rounded-md',
    md: 'w-8 h-8 text-[11px] rounded-lg',
    lg: 'w-10 h-10 text-[13px] rounded-xl',
  } as const;

  return (
    <span
      title={title ?? def?.label ?? platform}
      className={cn(
        'inline-flex items-center justify-center font-bold text-white shrink-0 select-none',
        sizes[size],
        className,
      )}
      style={{ backgroundColor: def?.color ?? '#6B7280' }}
      aria-hidden="true"
    >
      {def?.mark ?? platform.slice(0, 2)}
    </span>
  );
}
