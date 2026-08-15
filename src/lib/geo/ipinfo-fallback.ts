// Server-only: never import this from a client component. It is only ever
// called from src/app/api/weather/route.ts, and only as a fallback when
// Vercel's geo headers are absent (local dev / non-Vercel self-host —
// production traffic on Vercel is resolved for free via getVercelGeo and
// never reaches this function).
//
// No-ops (returns null, makes no network call) whenever IPINFO_TOKEN is
// unset, which is the default — see .env.example. Isolated in its own
// function so the provider is a one-line swap, and so its commercial-use
// terms can be re-verified independently before a non-Vercel production
// deployment relies on it (requirement: verify provider terms pre-launch).

export type IpGeoFallback = { country: string; region: string | null; timezone: string | null };

export async function resolveIpGeoFallback(request: Request): Promise<IpGeoFallback | null> {
  const token = process.env.IPINFO_TOKEN;
  if (!token) return null;

  const ip = getRequestIp(request);
  if (!ip) return null;

  try {
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(token)}`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { country?: string; region?: string; timezone?: string };
    if (!data.country) return null;

    return {
      country: data.country,
      region: data.region ?? null,
      timezone: data.timezone ?? null,
    };
  } catch {
    return null;
  }
}

/** Transient use only — the IP is never stored or returned to the client. */
function getRequestIp(request: Request): string | null {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return null;
}
