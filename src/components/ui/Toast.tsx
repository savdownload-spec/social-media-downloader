'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, AlertTriangle, Info, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────── */

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export type ToastInput = {
  /** Short title shown bold in the toast (1 line, ≤60 chars ideal). */
  title: string;
  /** Optional supporting text (1–2 lines). */
  description?: string;
  /** Variant drives icon + accent color. Default: 'info'. */
  variant?: ToastVariant;
  /** Auto-dismiss after this many ms. Default: 5000. Set to 0 to disable. */
  duration?: number;
  /** Optional CTA rendered as a button on the right. */
  action?: { label: string; onClick: () => void };
};

type ToastItem = {
  id: string;
  variant: ToastVariant;
  title: string;
  duration: number;
  description?: string;
  action?: ToastInput['action'];
};

/* ── Context + hook ────────────────────────────────────── */

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Useful no-op fallback so calling code can run during SSR / outside provider.
    const noop = () => '';
    return {
      toast: noop,
      dismiss: noop,
      success: noop,
      error: noop,
      warning: noop,
      info: noop,
    };
  }
  return ctx;
}

/* ── Provider ──────────────────────────────────────────── */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setMounted(true);
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback<ToastContextValue['toast']>((input) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      variant: input.variant ?? 'info',
      duration: input.duration ?? 5000,
      action: input.action,
    };
    setToasts((prev) => [...prev, item]);
    if (item.duration > 0) {
      const handle = setTimeout(() => dismiss(id), item.duration);
      timers.current.set(id, handle);
    }
    return id;
  }, [dismiss]);

  const api = useMemo<ToastContextValue>(() => ({
    toast,
    dismiss,
    success: (title, description) => toast({ title, description, variant: 'success' }),
    error: (title, description) => toast({ title, description, variant: 'error' }),
    warning: (title, description) => toast({ title, description, variant: 'warning' }),
    info: (title, description) => toast({ title, description, variant: 'info' }),
  }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <ToastViewport toasts={toasts} onDismiss={dismiss} />,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/* ── Viewport (the actual on-screen stack) ─────────────── */

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(100%-2rem,24rem)] flex-col gap-2.5"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Single toast card ─────────────────────────────────── */

const variantStyles: Record<ToastVariant, { ring: string; icon: string; Icon: typeof CheckCircle2 }> = {
  success: {
    ring: 'ring-1 ring-emerald-200/80',
    icon: 'bg-emerald-50 text-emerald-600',
    Icon: CheckCircle2,
  },
  error: {
    ring: 'ring-1 ring-rose-200/80',
    icon: 'bg-rose-50 text-rose-600',
    Icon: XCircle,
  },
  warning: {
    ring: 'ring-1 ring-amber-200/80',
    icon: 'bg-amber-50 text-amber-600',
    Icon: AlertTriangle,
  },
  info: {
    ring: 'ring-1 ring-indigo-200/80',
    icon: 'bg-indigo-50 text-indigo-600',
    Icon: Info,
  },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const style = variantStyles[toast.variant];
  const Icon = style.Icon;

  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={cn(
        'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden',
        'rounded-2xl bg-white p-4 pr-10 shadow-soft-lg',
        style.ring,
      )}
    >
      <span
        className={cn(
          'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
          style.icon,
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-[13px] text-text-muted leading-snug">{toast.description}</p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="mt-2 inline-flex items-center gap-1 rounded-lg text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-lg text-text-subtle hover:bg-surface hover:text-text transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
