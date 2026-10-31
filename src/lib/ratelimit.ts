import { getRedis } from './redis';

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  unavailable?: boolean;
};

/** Standard headers for successful and rejected rate-limited responses. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetSeconds),
  };
  if (!result.success) headers['Retry-After'] = String(Math.max(1, result.resetSeconds));
  return headers;
}

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
  const fwd = req.headers.get('x-vercel-forwarded-for') ?? req.headers.get('x-forwarded-for');
  const ip = fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip')?.trim();
  if (ip) return ip.slice(0, 128);

  // Local development and some proxies omit IP headers. Avoid putting every
  // such caller into one global "anon" bucket while keeping the key free of
  // raw user-agent data.
  const fingerprint = `${req.headers.get('user-agent') ?? 'unknown'}|${req.headers.get('accept-language') ?? ''}`;
  let hash = 2166136261;
  for (let i = 0; i < fingerprint.length; i++) {
    hash ^= fingerprint.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `anonymous-${(hash >>> 0).toString(36)}`;
}
