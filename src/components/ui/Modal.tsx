'use client';

import {
  useCallback, useEffect, useId, useRef, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────── */

type ModalSize = 'sm' | 'md' | 'lg';

type ModalProps = {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the user dismisses (Esc, backdrop click, or close button). */
  onClose: () => void;
  /** Optional headline, renders as an H2. */
  title?: ReactNode;
  /** Optional supporting text under the title. */
  description?: ReactNode;
  /** The body content. */
  children: ReactNode;
  /** Optional footer, typically buttons. */
  footer?: ReactNode;
  /** Width. Default 'md'. */
  size?: ModalSize;
  /** Hide the X button. Default false. */
  hideCloseButton?: boolean;
  /** Disable backdrop click to close. Default false. */
  disableBackdropClose?: boolean;
};

const sizeClass: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

/* ── Component ─────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideCloseButton = false,
  disableBackdropClose = false,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActive = useRef<HTMLElement | null>(null);

  // ESC closes; body scroll locks; focus moves into the dialog.
  useEffect(() => {
    if (!open) return;

    previousActive.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    // Focus the first focusable inside the dialog
    const t = setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      target?.focus();
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
      previousActive.current?.focus();
    };
  }, [open, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disableBackdropClose) return;
      if (e.target === e.currentTarget) onClose();
    },
    [onClose, disableBackdropClose],
  );

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-ink/60 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            key="modal-dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className={cn(
              'relative w-full overflow-hidden rounded-3xl bg-white shadow-soft-xl',
              'max-h-[calc(100vh-2rem)] flex flex-col',
              sizeClass[size],
            )}
          >
            {(title || !hideCloseButton) && (
              <div className="flex items-start justify-between gap-4 px-6 pt-6">
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2 id={titleId} className="text-lg md:text-xl font-bold tracking-tight text-text">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descId} className="mt-1.5 text-sm text-text-muted leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                {!hideCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="-mr-1 -mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-subtle hover:bg-surface hover:text-text transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {footer && (
              <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border-light bg-surface/40 px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/* ── Confirm helper ────────────────────────────────────── */

type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

/**
 * Imperative confirm helper. Use via the useConfirm() hook exported below.
 * Renders a single dialog slot managed by the provider.
 */
export function buildConfirmApi(opts: {
  open: boolean;
  setOpen: (v: boolean) => void;
  pending: ConfirmOptions | null;
  setPending: (v: ConfirmOptions | null) => void;
  resolver: React.MutableRefObject<((v: boolean) => void) | null>;
}): ConfirmFn {
  return (next) => {
    opts.setPending(next);
    opts.setOpen(true);
    return new Promise<boolean>((resolve) => {
      opts.resolver.current = resolve;
    });
  };
}

export function ConfirmDialogShell({
  open,
  onClose,
  onConfirm,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: ConfirmOptions | null;
}) {
  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
      }}
      title={pending?.title}
      description={pending?.description}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:text-text hover:bg-surface transition-colors"
          >
            {pending?.cancelLabel ?? 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              'inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              pending?.variant === 'danger'
                ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-soft'
                : 'bg-text text-white hover:bg-text/90 shadow-soft',
            )}
          >
            {pending?.confirmLabel ?? 'Confirm'}
          </button>
        </>
      }
    >
      <p className="text-sm text-text-muted">
        {/* Placeholder for visual structure; real text comes from `description`. */}
      </p>
    </Modal>
  );
}
