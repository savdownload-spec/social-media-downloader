'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiGet } from './api';
import type { Bootstrap } from './types';

export function useSocialBootstrap() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiGet<Bootstrap>('/api/admin/social/bootstrap'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the Social Media Manager.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}

export function can(capabilities: readonly string[] | undefined, capability: string): boolean {
  return Boolean(capabilities?.includes(capability));
}
