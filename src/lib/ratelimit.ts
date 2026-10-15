import { getRedis } from './redis';

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  unavailable?: boolean;
};

/**
 * Fixed-window rate limiter using Redis INCR + EXPIRE.
 * Falls back to always-allow for legacy callers (dev convenience).
 * Public subscription flows opt into failClosed to require working Redis.
 */
export async function ratelimit(
  identifier: string,
  { limit = 20, windowSeconds = 60, failClosed = false }: { limit?: number; windowSeconds?: number; failClosed?: boolean } = {},
): Promise<RateLimitResult> {
  const r = getRedis();
  const defaultResult: RateLimitResult = {
    success: !failClosed,
    limit,
    remaining: limit,
    resetSeconds: windowSeconds,
    unavailable: true,
  };

  if (!r) return defaultResult;

  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `rl:${identifier}:${window}`;

  try {
    const count = await r.incr(key);
    if (count === 1) await r.expire(key, windowSeconds);
    return {
      success: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetSeconds: windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds),
    };
  } catch {
    return defaultResult;
  }
}

/** Extracts a best-effort identifier for rate limiting from a request. */
export function getClientId(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'anon';
}
