import type { NextRequest } from 'next/server';
import { ok } from '@/lib/api';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { getVercelGeo } from '@/lib/geo/vercel-geo';
import { getRegionWeather } from '@/lib/weather/cache';
import { fetchWeatherCondition } from '@/lib/weather/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public, unauthenticated, decorative endpoint — called at most once per
 * client session (see WeatherContext's sessionStorage cache), backed by a
 * region-level Redis cache (see lib/weather/cache.ts) so concurrent
 * visitors from the same country share one upstream call. Always resolves
 * 200 with `condition: null` when geo/weather/rate-limit is unavailable —
 * this must never be the reason a page fails to load.
 *
 * Region comes ONLY from Vercel's free edge geo headers — there is no
 * third-party IP-geolocation fallback. On non-Vercel hosts (local dev,
 * self-host) this simply resolves `condition: null` and effects stay off.
 */
export async function GET(request: NextRequest) {
  const rl = await ratelimit(`weather:${getClientId(request)}`, { limit: 30, windowSeconds: 60 });
  if (!rl.success) return ok({ condition: null, intensity: null });

  const country = getVercelGeo(request.headers)?.country ?? null;

  if (!country) return ok({ condition: null, intensity: null });

  const result = await getRegionWeather(country.toUpperCase(), () => fetchWeatherCondition(country));

  return ok({ condition: result?.condition ?? null, intensity: result?.intensity ?? null });
}
