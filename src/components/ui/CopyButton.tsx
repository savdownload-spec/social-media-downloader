'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/clipboard';
import { useToast } from './Toast';

type CopyButtonProps = {
  /** The text to copy. Required. */
  value: string;
  /** Visual size. Default 'md'. */
  size?: 'sm' | 'md';
  /** Visual variant. Default 'outline'. */
  variant?: 'outline' | 'ghost' | 'solid' | 'icon';
  /** Toast title shown on success. Default 'Copied!'. */
  successMessage?: string;
  /** Toast description on success. */
  successDescription?: string;
  /** Override the default error toast. */
  onErrorMessage?: string;
  /** Optional className for the trigger. */
  className?: string;
  /** Optional children to render instead of the default "Copy" label. */
  children?: ReactNode;
  /** Optional icon override (default: Copy/Check). */
  showIcon?: boolean;
  /** Optional aria-label override. */
  'aria-label'?: string;
};

/**
 * One-click copy-to-clipboard button with built-in toast feedback.
 *
 * Usage:
 *   <CopyButton value="https://savdown.com/tools/youtube" />
 *   <CopyButton value={url} variant="icon" successMessage="Link copied" />
 */
export function CopyButton({
  value,
  size = 'md',
  variant = 'outline',
  successMessage = 'Copied!',
  successDescription,
  onErrorMessage = 'Could not copy. Please copy it manually.',
  className,
  children,
  showIcon = true,
  'aria-label': ariaLabel = 'Copy to clipboard',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { success, error: errorToast } = useToast();

  const onClick = useCallback(async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      success(successMessage, successDescription);
      setTimeout(() => setCopied(false), 1800);
    } else {
      errorToast('Copy failed', onErrorMessage);
    }
  }, [value, successMessage, successDescription, onErrorMessage, success, errorToast]);

  const sizing = size === 'sm' ? 'h-8 px-3 text-xs rounded-lg' : 'h-10 px-4 text-sm rounded-xl';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-muted hover:text-text hover:bg-surface transition-colors',
          copied && 'text-accent-hover hover:text-accent-hover',
          className,
        )}
      >
        {copied ? <Check className={iconSize} /> : <Copy className={iconSize} />}
      </button>
    );
  }

  const variantClass =
    variant === 'solid'
      ? 'bg-text text-white hover:bg-text/90 shadow-soft'
      : variant === 'ghost'
      ? 'text-text-muted hover:text-text hover:bg-surface'
      : 'bg-white text-text border border-border hover:border-primary/40 hover:bg-primary-light/30';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'active:scale-[0.98]',
        sizing,
        variantClass,
        className,
      )}
    >
      {showIcon && (copied ? <Check className={iconSize} /> : <Copy className={iconSize} />)}
      {children ?? (copied ? 'Copied' : 'Copy')}
    </button>
  );
}
