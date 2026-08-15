'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Debounced autosave: fires `onSave(value)` ~2.5s after the value stops
 * changing. Comparison is by JSON serialization so it works for the whole
 * editor form snapshot without callers tracking dirty fields manually.
 */
export function useAutosave<T>(value: T, onSave: (value: T) => Promise<void>, opts: { enabled: boolean; delay?: number }) {
  const { enabled, delay = 2500 } = opts;
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const lastSaved = useRef<string>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);

  const runSave = useCallback(async (snapshot: T) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setStatus('saving');
    try {
      await onSave(snapshot);
      lastSaved.current = JSON.stringify(snapshot);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      savingRef.current = false;
    }
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;
    const serialized = JSON.stringify(value);
    if (serialized === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runSave(value), delay);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, delay]);

  const retry = useCallback(() => runSave(value), [runSave, value]);

  return { status, retry };
}
