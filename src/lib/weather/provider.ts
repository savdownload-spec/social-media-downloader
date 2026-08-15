// Server-only: only ever imported from src/lib/weather/cache.ts (in turn
// only imported from src/app/api/weather/route.ts). Never import this from
// a client component — OPENWEATHER_API_KEY must never reach the browser.
//
// Uses ONLY OpenWeather's free "Current Weather Data" endpoint
// (/data/2.5/weather) — deliberately NOT One Call 3.0/4.0, which are
// pay-as-you-call products with a much smaller free allotment. Query point
// is the visitor's country's capital city (see country-capitals.ts), never
// the visitor's own coordinates — this is country-level personalization
// only, not per-visitor location.

import { getRedis } from '@/lib/redis';
import { COUNTRY_CAPITALS } from './country-capitals';

export type WeatherCondition = 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm';
export type WeatherIntensity = 'light' | 'moderate';
export type WeatherResult = { condition: WeatherCondition; intensity: WeatherIntensity };

const OWM_ENDPOINT = 'https://api.openweathermap.org/data/2.5/weather';
const DEFAULT_DAILY_BUDGET = 900;

export async function fetchWeatherCondition(countryCode: string): Promise<WeatherResult | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null; // No key configured: weather effects silently disabled site-wide.

  const capital = COUNTRY_CAPITALS[countryCode.toUpperCase()];
  if (!capital) return null; // Unmapped country: degrade gracefully rather than guess a location.

  if (!(await withinDailyBudget())) return null;

  try {
    const url = `${OWM_ENDPOINT}?lat=${capital.lat}&lon=${capital.lon}&appid=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;

    const data = (await res.json()) as { weather?: Array<{ id?: number }> };
    const id = data.weather?.[0]?.id;
    if (typeof id !== 'number') return null;

    return mapConditionId(id);
  } catch {
    return null;
  }
}

/**
 * Maps OpenWeather's condition code to one of our 5 decorative buckets.
 * Intensity is deliberately capped at 'moderate' — the decorative layer
 * never renders a "heavy" effect, matching the subtle-only requirement.
 */
export function mapConditionId(id: number): WeatherResult {
  if (id >= 200 && id < 300) return { condition: 'storm', intensity: 'moderate' };
  if (id >= 300 && id < 400) return { condition: 'rain', intensity: 'light' };
  if (id >= 500 && id < 600) return { condition: 'rain', intensity: id === 500 ? 'light' : 'moderate' };
  if (id >= 600 && id < 700) return { condition: 'snow', intensity: id === 600 ? 'light' : 'moderate' };
  if (id >= 700 && id < 800) return { condition: 'cloudy', intensity: 'light' };
  if (id === 800) return { condition: 'clear', intensity: 'light' };
  if (id > 800 && id < 900) return { condition: 'cloudy', intensity: id <= 802 ? 'light' : 'moderate' };
  return { condition: 'clear', intensity: 'light' };
}

/**
 * Tracks a UTC-daily call counter in Redis so OpenWeather's free-tier limit
 * is never exceeded and no charges can ever be auto-incurred: once the
 * configured budget is hit for the day, no further upstream calls are
 * attempted — callers fall back to the cache's stale entry (see cache.ts)
 * or disable effects entirely if none exists. Re-verify the real free-tier
 * ceiling against WEATHER_DAILY_CALL_BUDGET before production launch.
 */
async function withinDailyBudget(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true; // No Redis: budget tracking is best-effort only.

  const budget = Number(process.env.WEATHER_DAILY_CALL_BUDGET) || DEFAULT_DAILY_BUDGET;
  const day = new Date().toISOString().slice(0, 10);
  const key = `weather:v1:calls:${day}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 172800); // 2 days, comfortably covers the UTC-day window
    return count <= budget;
  } catch {
    return true;
  }
}
