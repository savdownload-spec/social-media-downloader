import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full bg-white dark:bg-card border border-border rounded-2xl px-5 py-3.5',
        'text-text placeholder:text-text-subtle',
        'focus:outline-none focus:border-primary focus:shadow-glow',
        'transition-all duration-200',
        className,
      )}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';
