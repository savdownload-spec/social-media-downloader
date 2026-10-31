import { NextResponse } from 'next/server';
import { getClientId, ratelimit, rateLimitHeaders, type RateLimitResult } from '@/lib/ratelimit';

type LimitOptions = { limit: number; windowSeconds: number };

function rejected(result: RateLimitResult) {
  const unavailable = result.unavailable === true;
  return NextResponse.json(
    {
      ok: false,
      error: unavailable
        ? 'Image processing is temporarily unavailable. Please try again shortly.'
        : `Too many requests. Try again in ${result.resetSeconds} second${result.resetSeconds === 1 ? '' : 's'}.`,
      code: unavailable ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED',
      retryAfter: result.resetSeconds,
    },
    { status: unavailable ? 503 : 429, headers: rateLimitHeaders(result) },
  );
}

/** Per-IP protection applied before parsing large uploads. */
export async function checkImageIpLimit(req: Request, scope: string, options: LimitOptions) {
  const result = await ratelimit(`image:${scope}:ip:${getClientId(req)}`, { ...options, failClosed: process.env.NODE_ENV === 'production' });
  return result.success ? null : rejected(result);
}

/** Per-account protection. Uses a separate namespace, never the IP counter. */
export async function checkImageUserLimit(userId: string, scope: string, options: LimitOptions) {
  const result = await ratelimit(`image:${scope}:user:${userId}`, { ...options, failClosed: process.env.NODE_ENV === 'production' });
  return result.success ? null : rejected(result);
}
