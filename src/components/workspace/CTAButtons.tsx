import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CTAProps {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  className?: string;
}

/** Large, prominent primary action — used for things like "Read Full Guide". */
export function PrimaryCTA({ href, children, external, className }: CTAProps) {
  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(
        'w-full flex items-center justify-center gap-2 h-14 px-6 rounded-2xl text-white text-base font-semibold bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all active:scale-[0.99]',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function SecondaryCTA({ href, children, external, className }: CTAProps) {
  return (
    <Link
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl border border-border bg-white dark:bg-card text-sm font-semibold text-text hover:border-primary/30 hover:bg-primary-light transition-colors',
        className,
      )}
    >
      {children}
    </Link>
  );
}
