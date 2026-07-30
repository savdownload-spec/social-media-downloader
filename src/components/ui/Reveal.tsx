import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Reusable entrance animation. Implemented with a pure-CSS keyframe (see the
 * `.reveal` utility) rather than a JS-gated opacity so content is ALWAYS
 * visible even if scripts or animations never run. The optional delay creates
 * a gentle stagger between sibling items.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('reveal', className)}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
