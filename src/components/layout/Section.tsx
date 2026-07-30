import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Container } from './Container';

type Variant = 'default' | 'muted' | 'white' | 'tinted' | 'dark';

const variants: Record<Variant, string> = {
  default: '',
  muted: 'bg-surface',
  white: 'bg-white border-y border-border-light',
  tinted: 'bg-gradient-brand-soft border-y border-border-light',
  dark: 'bg-ink text-white',
};

type SectionProps = HTMLAttributes<HTMLElement> & {
  variant?: Variant;
  /** Extra classes for the inner Container (e.g. a tighter max-width). */
  containerClassName?: string;
  /** Set false to render children without the standard Container wrapper. */
  contained?: boolean;
};

/**
 * One spacing + background primitive for every marketing section, so the whole
 * site shares identical vertical rhythm (equal top/bottom padding) and a small,
 * curated set of background treatments for visual contrast.
 */
export function Section({
  variant = 'default',
  className,
  containerClassName,
  contained = true,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      className={cn('py-20 md:py-28', variants[variant], className)}
      {...rest}
    >
      {contained ? (
        <Container className={containerClassName}>{children}</Container>
      ) : (
        children
      )}
    </section>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'center' | 'left';
  dark?: boolean;
  className?: string;
};

/**
 * Consistent section header: an eyebrow label, a display-font title, and an
 * optional supporting line. Centered by default for balance; left-aligned only
 * where the surrounding content reads better that way.
 */
export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  dark = false,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            'text-sm font-semibold uppercase tracking-wider mb-3 inline-block',
            dark ? 'text-gradient-light' : 'text-gradient',
          )}
        >
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          'text-3xl md:text-4xl font-bold tracking-tight',
          dark ? 'text-white' : 'text-text',
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-4 text-base md:text-lg leading-relaxed',
            align === 'center' ? 'mx-auto max-w-xl' : '',
            dark ? 'text-ink-muted' : 'text-text-muted',
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
