import { getRedis } from './redis';

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  unavailable?: boolean;
};

type MemoryWindow = { count: number; expiresAt: number };
const memoryWindows = new Map<string, MemoryWindow>();

function memoryRateLimit(identifier: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryWindows.get(identifier);
  const entry = !existing || existing.expiresAt <= now
    ? { count: 1, expiresAt: now + windowSeconds * 1000 }
    : { ...existing, count: existing.count + 1 };
  memoryWindows.set(identifier, entry);

  // Keep long-lived instances bounded without a timer that can hold them open.
  if (memoryWindows.size > 5_000) {
    for (const [key, value] of memoryWindows) {
      if (value.expiresAt <= now) memoryWindows.delete(key);
    }
    while (memoryWindows.size > 4_000) {
      const oldestKey = memoryWindows.keys().next().value as string | undefined;
      if (!oldestKey) break;
      memoryWindows.delete(oldestKey);
    }
  }

  return {
    success: entry.count <= limit,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetSeconds: Math.max(1, Math.ceil((entry.expiresAt - now) / 1000)),
    unavailable: true,
  };
}

/** Test-only reset for deterministic fallback-limit coverage. */
export function resetMemoryRateLimitsForTests() {
  memoryWindows.clear();
}

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
  { limit = 20, windowSeconds = 60, failClosed = false, fallbackToMemory = false }: { limit?: number; windowSeconds?: number; failClosed?: boolean; fallbackToMemory?: boolean } = {},
): Promise<RateLimitResult> {
  const r = getRedis();
  const defaultResult: RateLimitResult = {
    success: !failClosed,
    limit,
    remaining: limit,
    resetSeconds: windowSeconds,
    unavailable: true,
  };

  if (!r) return fallbackToMemory ? memoryRateLimit(identifier, limit, windowSeconds) : defaultResult;

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
    return fallbackToMemory ? memoryRateLimit(identifier, limit, windowSeconds) : defaultResult;
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
