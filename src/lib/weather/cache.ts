import { getRedis } from '@/lib/redis';

const FRESH_TTL_SECONDS = 1800; // 30 minutes
const STALE_TTL_SECONDS = 21600; // 6 hours

/**
 * Region-level (country-code) weather cache with stale-on-failure fallback.
 * Not built on top of `cacheJson` because that helper always re-invokes the
 * fetcher on a cache miss with no way to fall back to a last-known-good
 * value when the fetch itself fails — exactly the behavior required here:
 * upstream failure (or the daily call budget in provider.ts being hit)
 * should serve the last cached result rather than disabling effects
 * immediately, and only return null (site continues normally, effects off)
 * once even the stale entry is gone.
 */
export async function getRegionWeather<T>(
  regionKey: string,
  fetcher: () => Promise<T | null>,
): Promise<T | null> {
  const redis = getRedis();
  const freshKey = `weather:v1:fresh:${regionKey}`;
  const staleKey = `weather:v1:stale:${regionKey}`;

  if (redis) {
    try {
      const cached = await redis.get(freshKey);
      if (cached) return JSON.parse(cached) as T;
    } catch {
      // fall through to a live fetch
    }
  }

  const fresh = await fetcher();

  if (fresh !== null) {
    if (redis) {
      try {
        await redis.set(freshKey, JSON.stringify(fresh), FRESH_TTL_SECONDS);
        await redis.set(staleKey, JSON.stringify(fresh), STALE_TTL_SECONDS);
      } catch {
        // cache write failure shouldn't break the response
      }
    }
    return fresh;
  }

  if (!redis) return null;
  try {
    const stale = await redis.get(staleKey);
    return stale ? (JSON.parse(stale) as T) : null;
  } catch {
    return null;
  }
}
