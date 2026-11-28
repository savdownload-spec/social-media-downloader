import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_ATTR,
  CONSENT_COOKIE,
  CONSENT_INIT_SCRIPT,
  CONSENT_MAX_AGE_DAYS,
  acceptAllPreferences,
  clearAnalyticsCookies,
  parseConsent,
  readStoredConsent,
  serializeConsent,
  shouldLoadGtm,
  toConsentSignals,
  writeConsentCookie,
} from './cookie-consent';

function runInitScript(cookie: string) {
  const window = { dataLayer: [] as unknown[] };
  const attributes: Record<string, string> = {};
  const document = {
    cookie,
    documentElement: { setAttribute: (name: string, value: string) => { attributes[name] = value; } },
  };
  new Function('window', 'document', CONSENT_INIT_SCRIPT)(window, document);
  const commands = window.dataLayer.map((entry) => Array.from(entry as unknown[]));
  const defaults = commands.find(([kind, mode]) => kind === 'consent' && mode === 'default');
  return { attributes, commands, defaultSignals: defaults?.[2] as Record<string, string> | undefined };
}

describe('consent record', () => {
  it('round-trips every preference combination', () => {
    for (const analytics of [false, true]) {
      for (const marketing of [false, true]) {
        const preferences = { necessary: true, analytics, marketing };
        expect(parseConsent(serializeConsent(preferences))).toEqual(preferences);
      }
    }
    expect(serializeConsent(acceptAllPreferences())).toBe('1.1.1');
  });

  it('rejects missing, malformed and outdated records', () => {
    for (const raw of ['', null, undefined, '1', '1.1', '1.1.0.0', '2.1.1', '1.2.0', '1.a.1', 'abc']) {
      expect(parseConsent(raw)).toBeNull();
    }
  });
});

describe('consent signals', () => {
  it('grants analytics and marketing independently of each other', () => {
    expect(toConsentSignals({ necessary: true, analytics: true, marketing: false })).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
      functionality_storage: 'granted',
      security_storage: 'granted',
    });
    expect(toConsentSignals({ necessary: true, analytics: false, marketing: true })).toMatchObject({
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'denied',
    });
  });

  it('only loads the tag container when an optional category is allowed', () => {
    expect(shouldLoadGtm({ necessary: true, analytics: false, marketing: false })).toBe(false);
    expect(shouldLoadGtm({ necessary: true, analytics: true, marketing: false })).toBe(true);
    expect(shouldLoadGtm({ necessary: true, analytics: false, marketing: true })).toBe(true);
  });
});

describe('blocking consent script', () => {
  it('denies everything and leaves the banner visible when there is no saved choice', () => {
    const { attributes, defaultSignals, commands } = runInitScript('');

    expect(defaultSignals).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied' });
    expect(defaultSignals).toMatchObject({ functionality_storage: 'granted', security_storage: 'granted' });
    expect(attributes).toEqual({});
    expect(commands.some(([kind, action]) => kind === 'js' && action instanceof Date)).toBe(true);
  });

  it('restores a saved choice, hides the banner and grants only what was allowed', () => {
    const accepted = runInitScript(`${CONSENT_COOKIE}=1.1.1; other=1`);
    expect(accepted.attributes[CONSENT_ATTR]).toBe('set');
    expect(accepted.defaultSignals).toMatchObject({ analytics_storage: 'granted', ad_storage: 'granted' });

    const analyticsOnly = runInitScript(`x=1; ${CONSENT_COOKIE}=1.1.0`);
    expect(analyticsOnly.attributes[CONSENT_ATTR]).toBe('set');
    expect(analyticsOnly.defaultSignals).toMatchObject({ analytics_storage: 'granted', ad_storage: 'denied' });

    const marketingOnly = runInitScript(`${CONSENT_COOKIE}=1.0.1`);
    expect(marketingOnly.defaultSignals).toMatchObject({ analytics_storage: 'denied', ad_storage: 'granted' });

    for (const invalid of ['sd_consent=2.1.1', 'sd_consent=1.x.0', 'sd_consent=garbage']) {
      const result = runInitScript(invalid);
      expect(result.attributes).toEqual({});
      expect(result.defaultSignals?.analytics_storage).toBe('denied');
    }
  });
});

describe('cookie storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('writes a persistent cookie and reads it back', () => {
    let stored = '';
    vi.stubGlobal('document', {
      get cookie() { return stored; },
      set cookie(value: string) { stored = value; },
    });
    vi.stubGlobal('window', { location: { protocol: 'https:', hostname: 'www.getsavdown.com' } });

    expect(readStoredConsent()).toBeNull();
    writeConsentCookie({ necessary: true, analytics: true, marketing: false });

    expect(stored).toContain(`${CONSENT_COOKIE}=1.1.0`);
    expect(stored).toContain(`Max-Age=${CONSENT_MAX_AGE_DAYS * 86_400}`);
    expect(stored).toContain('SameSite=Lax');
    expect(stored).toContain('Secure');
    expect(readStoredConsent()).toEqual({ necessary: true, analytics: true, marketing: false });
  });

  it('clears only Google cookies after tracking is withdrawn', () => {
    const writes: string[] = [];
    vi.stubGlobal('document', {
      get cookie() { return '_ga=1; _gid=2; sd_consent=1.1.1; _gcl_au=3; sd_auto_theme=light'; },
      set cookie(value: string) { writes.push(value); },
    });
    vi.stubGlobal('window', { location: { protocol: 'https:', hostname: 'www.getsavdown.com' } });

    clearAnalyticsCookies();

    const cleared = new Set(writes.map((cookie) => cookie.split('=')[0]));
    expect(cleared).toEqual(new Set(['_ga', '_gid', '_gcl_au']));
    expect(writes.every((cookie) => cookie.includes('expires=Thu, 01 Jan 1970'))).toBe(true);
    expect(writes.some((cookie) => cookie.includes('domain=.getsavdown.com'))).toBe(true);
  });
});
