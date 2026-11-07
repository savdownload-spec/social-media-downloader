import { NextResponse } from 'next/server';
import { getClientId, ratelimit, rateLimitHeaders, type RateLimitResult } from '@/lib/ratelimit';

type LimitOptions = { limit: number; windowSeconds: number };

function rejected(result: RateLimitResult) {
  return NextResponse.json(
    {
      ok: false,
      error: `Too many requests. Try again in ${result.resetSeconds} second${result.resetSeconds === 1 ? '' : 's'}.`,
      code: 'RATE_LIMITED',
      retryAfter: result.resetSeconds,
    },
    { status: 429, headers: rateLimitHeaders(result) },
  );
}

/** Per-IP protection applied before parsing large uploads. */
export async function checkImageIpLimit(req: Request, scope: string, options: LimitOptions) {
  const result = await ratelimit(`image:${scope}:ip:${getClientId(req)}`, { ...options, fallbackToMemory: true });
  return result.success ? null : rejected(result);
}

/** Per-account protection. Uses a separate namespace, never the IP counter. */
export async function checkImageUserLimit(userId: string, scope: string, options: LimitOptions) {
  const result = await ratelimit(`image:${scope}:user:${userId}`, { ...options, fallbackToMemory: true });
  return result.success ? null : rejected(result);
}
