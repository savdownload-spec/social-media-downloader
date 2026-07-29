import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'primary' | 'accent';
};

export function Badge({ tone = 'default', className, ...rest }: Props) {
  const tones = {
    default: 'bg-surface text-text-muted border-border',
    primary: 'bg-primary-light text-primary border-primary/20',
    accent: 'bg-accent-light text-accent-hover border-accent/20',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border',
        tones[tone],
        className,
      )}
      {...rest}
    />
  );
}
