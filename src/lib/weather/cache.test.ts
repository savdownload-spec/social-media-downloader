import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('@/lib/redis', () => ({
  getRedis: () => ({
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => {
      store.set(k, v);
    },
    incr: async () => 0,
    expire: async () => {},
    del: async (k: string) => {
      store.delete(k);
    },
  }),
}));

import { getRegionWeather } from './cache';

describe('getRegionWeather', () => {
  beforeEach(() => store.clear());

  it('returns a fresh cache hit without calling the fetcher', async () => {
    store.set('weather:v1:fresh:US', JSON.stringify({ condition: 'clear' }));
    const fetcher = vi.fn();

    const result = await getRegionWeather('US', fetcher);

    expect(result).toEqual({ condition: 'clear' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('calls the fetcher on a miss and writes both fresh and stale entries', async () => {
    const fetcher = vi.fn().mockResolvedValue({ condition: 'rain' });

    const result = await getRegionWeather('GB', fetcher);

    expect(result).toEqual({ condition: 'rain' });
    expect(store.get('weather:v1:fresh:GB')).toBe(JSON.stringify({ condition: 'rain' }));
    expect(store.get('weather:v1:stale:GB')).toBe(JSON.stringify({ condition: 'rain' }));
  });

  it('falls back to the stale entry when the fetcher returns null', async () => {
    store.set('weather:v1:stale:PK', JSON.stringify({ condition: 'cloudy' }));
    const fetcher = vi.fn().mockResolvedValue(null);

    const result = await getRegionWeather('PK', fetcher);

    expect(result).toEqual({ condition: 'cloudy' });
  });

  it('returns null when the fetcher fails and no stale entry exists — effects disable, nothing throws', async () => {
    const fetcher = vi.fn().mockResolvedValue(null);

    const result = await getRegionWeather('XX', fetcher);

    expect(result).toBeNull();
  });
});
