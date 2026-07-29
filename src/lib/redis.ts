/**
 * Redis client with dual support:
 *   - Local dev: ioredis via REDIS_URL (docker-compose provides redis:7-alpine)
 *   - Production/Vercel: Upstash REST via UPSTASH_REDIS_REST_URL/TOKEN
 *
 * Both are exposed behind a minimal common interface used by ratelimit + cache.
 */
import IORedis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

type MinimalRedis = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds?: number) => Promise<unknown>;
  incr: (key: string) => Promise<number>;
  expire: (key: string, ttlSeconds: number) => Promise<unknown>;
  del: (key: string) => Promise<unknown>;
};

let client: MinimalRedis | null = null;

export function getRedis(): MinimalRedis | null {
  if (client) return client;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const r = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    client = {
      get: async (k) => (await r.get<string>(k)) ?? null,
      set: async (k, v, ttl) => (ttl ? r.set(k, v, { ex: ttl }) : r.set(k, v)),
      incr: (k) => r.incr(k),
      expire: (k, ttl) => r.expire(k, ttl),
      del: (k) => r.del(k),
    };
    return client;
  }

  if (process.env.REDIS_URL) {
    const r = new IORedis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
    r.connect().catch(() => { /* silent — will retry per op */ });
    client = {
      get: (k) => r.get(k),
      set: async (k, v, ttl) => (ttl ? r.set(k, v, 'EX', ttl) : r.set(k, v)),
      incr: (k) => r.incr(k),
      expire: (k, ttl) => r.expire(k, ttl),
      del: (k) => r.del(k),
    };
    return client;
  }

  return null;
}

/** Simple JSON cache helper. Silently no-ops if Redis isn't configured. */
export async function cacheJson<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const r = getRedis();
  if (!r) return fetcher();

  try {
    const cached = await r.get(key);
    if (cached) return JSON.parse(cached) as T;
  } catch { /* fall through on any cache error */ }

  const fresh = await fetcher();
  try {
    await r.set(key, JSON.stringify(fresh), ttlSeconds);
  } catch { /* ignore */ }
  return fresh;
}
