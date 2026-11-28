/**
 * Cookie consent: the categories offered, the consent record, and the mapping
 * to Google Consent Mode v2 signals.
 *
 * The record is a first-party cookie rather than localStorage so the blocking
 * <head> script (CONSENT_INIT_SCRIPT) can read it before any tag loads, and so
 * a choice is scoped to the host it was made on. Its value is a tiny token,
 * `CONSENT_VERSION.analytics.marketing` (e.g. "1.1.0"), which keeps that
 * pre-paint parser trivial. Bumping CONSENT_VERSION invalidates every stored
 * choice, which is how adding a category re-prompts returning visitors.
 */

export type OptionalCategory = 'analytics' | 'marketing';
export type ConsentCategory = 'necessary' | OptionalCategory;
export type ConsentPreferences = Record<ConsentCategory, boolean>;

export const CONSENT_COOKIE = 'sd_consent';
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_DAYS = 180;

/** Set on <html> by the init script when a valid saved choice exists. */
export const CONSENT_ATTR = 'data-sd-consent';

type CategoryDefinition = {
  id: ConsentCategory;
  label: string;
  description: string;
};

/**
 * Mirrors what the site actually runs:
 * - necessary: NextAuth session/CSRF, rate limiting, referral attribution,
 *   the Auto theme hint, and this consent record.
 * - analytics: GA4 through GTM-5SX8RKCS, Vercel Analytics, Vercel Speed
 *   Insights and Ahrefs.
 * - marketing: Google Signals on the GA4 property (demographics and Google Ads
 *   audiences) and the AdSense placements reserved in the blog.
 */
export const COOKIE_CATEGORIES: readonly CategoryDefinition[] = [
  {
    id: 'necessary',
    label: 'Strictly necessary',
    description:
      'Required for sign-in, security and abuse prevention, remembering your theme and language, and saving this consent choice. The site cannot work without them.',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description:
      'Google Analytics (via Google Tag Manager), Vercel Analytics, Vercel Speed Insights and Ahrefs show which pages and tools get used, so we can fix problems and improve the site.',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description:
      'Enables advertising features such as Google Signals in Google Analytics and, where shown, ads on the blog, to measure campaigns and show more relevant ads.',
  },
];

export function defaultPreferences(): ConsentPreferences {
  return { necessary: true, analytics: false, marketing: false };
}

export function acceptAllPreferences(): ConsentPreferences {
  return { necessary: true, analytics: true, marketing: true };
}

export function serializeConsent(preferences: ConsentPreferences): string {
  return [CONSENT_VERSION, Number(preferences.analytics), Number(preferences.marketing)].join('.');
}

export function parseConsent(raw: string | null | undefined): ConsentPreferences | null {
  if (!raw) return null;
  const [version, analytics, marketing, extra] = raw.split('.');
  if (version !== String(CONSENT_VERSION) || extra !== undefined) return null;
  if (!isFlag(analytics) || !isFlag(marketing)) return null;
  return { necessary: true, analytics: analytics === '1', marketing: marketing === '1' };
}

function isFlag(value: string | undefined): value is '0' | '1' {
  return value === '0' || value === '1';
}

export type ConsentMode = 'granted' | 'denied';

export function toConsentSignals(preferences: ConsentPreferences): Record<string, ConsentMode> {
  const ads: ConsentMode = preferences.marketing ? 'granted' : 'denied';
  return {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
    analytics_storage: preferences.analytics ? 'granted' : 'denied',
    // Theme, language and sign-in storage is always on (strictly necessary).
    functionality_storage: 'granted',
    security_storage: 'granted',
  };
}

/** GTM carries both the GA4 tag (analytics) and any ad tags (marketing). */
export function shouldLoadGtm(preferences: ConsentPreferences): boolean {
  return preferences.analytics || preferences.marketing;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match?.[1];
}

export function readStoredConsent(): ConsentPreferences | null {
  if (typeof document === 'undefined') return null;
  return parseConsent(readCookie(CONSENT_COOKIE));
}

export function writeConsentCookie(preferences: ConsentPreferences): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${CONSENT_COOKIE}=${serializeConsent(preferences)}; Path=/; ` +
    `Max-Age=${CONSENT_MAX_AGE_DAYS * 86_400}; SameSite=Lax${secure}`;
}

const ANALYTICS_COOKIE_PREFIX = /^_(ga|gid|gcl|gclp|dc_gtm)/;

/** Removes Google cookies left by an earlier visit, after tracking is withdrawn. */
export function clearAnalyticsCookies(): void {
  if (typeof document === 'undefined') return;
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
  const host = window.location.hostname;
  const domains = ['', host, `.${host}`];
  if (host.split('.').length > 2) domains.push(`.${host.split('.').slice(-2).join('.')}`);

  const names = new Set<string>();
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim();
    if (name && ANALYTICS_COOKIE_PREFIX.test(name)) names.add(name);
  }
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; ${expired}${domain ? `; domain=${domain}` : ''}`;
    }
  }
}

/**
 * Blocking script for <head>. Sets Consent Mode v2 defaults from the saved
 * choice (denied until consented) and defines gtag before any tag runs, and
 * marks <html> when a valid choice exists so the server-rendered cookie banner
 * is hidden before first paint instead of flashing until hydration.
 *
 * Mirrors parseConsent()/toConsentSignals() by hand; it cannot import them.
 * `gtag('js')` is issued here because the container's GA4 Google tag needs it
 * to send hits when GTM is injected after window load.
 */
export const CONSENT_INIT_SCRIPT = `(function(){try{
var s={ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted'};
var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]*)/);
if(m){var p=m[1].split('.');if(p.length===3&&p[0]==='${CONSENT_VERSION}'&&/^[01]$/.test(p[1])&&/^[01]$/.test(p[2])){document.documentElement.setAttribute('${CONSENT_ATTR}','set');if(p[1]==='1'){s.analytics_storage='granted';}if(p[2]==='1'){s.ad_storage='granted';s.ad_user_data='granted';s.ad_personalization='granted';}}}
window.dataLayer=window.dataLayer||[];
window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
window.gtag('consent','default',s);
window.gtag('js',new Date());
}catch(e){}})();`;
