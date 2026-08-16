/**
 * Reads Vercel's edge-injected IP geolocation headers for features such as Auto theme.
 * Returns null on non-Vercel hosts.
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
