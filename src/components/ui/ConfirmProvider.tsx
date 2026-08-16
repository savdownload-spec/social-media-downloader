'use client';

import {
  createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { Modal } from './Modal';
import { cn } from '@/lib/utils';

type ConfirmOptions = {
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback: never block. Use in places that might render outside provider.
    return {
      confirm: async () => {
        if (typeof window === 'undefined') return false;
        return window.confirm('Are you sure?');
      },
    };
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpen(false);
    setPending(null);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setPending(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const api = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      <Modal
        open={open}
        onClose={() => close(false)}
        title={pending?.title}
        description={pending?.description}
        size="sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => close(false)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:text-text hover:bg-surface transition-colors"
            >
              {pending?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              className={cn(
                'inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                pending?.variant === 'danger'
                  ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-soft'
                  : 'bg-text text-white hover:bg-text/90 dark:bg-primary dark:hover:bg-primary-hover shadow-soft',
              )}
            >
              {pending?.confirmLabel ?? 'Confirm'}
            </button>
          </>
        }
      >
        {/* Description is shown above via the title block; this is a fallback slot
            so callers can also pass richer body content via a custom slot. */}
        {!pending?.description && (
          <p className="text-sm text-text-muted">Are you sure you want to continue?</p>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}
