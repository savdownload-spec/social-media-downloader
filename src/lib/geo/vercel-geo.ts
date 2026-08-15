/**
 * Reads Vercel's edge-injected IP geolocation headers. Free, zero-latency,
 * no external API call, and the app never sees or stores the raw visitor
 * IP — Vercel resolves these at the edge before the request reaches us.
 * Returns null on any non-Vercel host (local dev, self-host), where the
 * caller falls back to `resolveIpGeoFallback` or the browser-timezone chain.
 *
 * Header names per Vercel's documented edge network geolocation contract.
 */
export type VercelGeo = {
  country: string;
  region: string | null;
  city: string | null;
  timezone: string | null;
};

export function getVercelGeo(headers: Headers): VercelGeo | null {
  const country = headers.get('x-vercel-ip-country');
  if (!country) return null;

  return {
    country,
    region: headers.get('x-vercel-ip-country-region'),
    city: headers.get('x-vercel-ip-city'),
    timezone: headers.get('x-vercel-ip-timezone'),
  };
}
