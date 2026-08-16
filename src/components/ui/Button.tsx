'use client';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const base =
  'relative inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-brand bg-[length:200%_200%] hover:bg-[position:100%_50%] ' +
    'shadow-glow-lg hover:shadow-[0_14px_48px_-8px_rgb(124_58_237_/_0.5)]',
  secondary:
    'bg-white dark:bg-card text-text hover:bg-white/90 dark:hover:bg-card-hover shadow-soft-md hover:shadow-soft-lg',
  dark:
    'bg-text text-white hover:bg-text/90 dark:bg-primary dark:hover:bg-primary-hover shadow-soft-md hover:shadow-soft-lg',
  ghost:
    'bg-transparent text-text hover:bg-surface',
  outline:
    'bg-white dark:bg-card text-text border border-border hover:border-primary/40 hover:bg-primary-light',
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3.5 py-2 rounded-xl',
  md: 'text-sm px-5 py-2.5 rounded-2xl',
  lg: 'text-base px-7 py-3.5 rounded-2xl font-semibold',
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
