/**
 * Shared day/night resolver used by both Edge Middleware (server, given the
 * visitor's IP-derived timezone) and the client-side fallback script (given
 * the browser's own timezone) — kept in one place so the two never drift.
 *
 * Day (06:00–17:59 local) resolves to 'light', everything else to 'dark'.
 */
export function resolveDayNight(timezone: string, now: Date = new Date()): 'light' | 'dark' {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour')?.value;
    if (!hourPart) return 'light';
    // Some environments format midnight as "24" under hour12:false.
    const hour = Number(hourPart) % 24;
    return hour >= 6 && hour < 18 ? 'light' : 'dark';
  } catch {
    return 'light';
  }
}
