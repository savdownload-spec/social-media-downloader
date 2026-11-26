import { describe, expect, it } from 'vitest';
import { classifyCronCaller, verifyCronAuthorization } from './cron-auth';

describe('verifyCronAuthorization', () => {
  const secret = 'cron-secret-value-1234';

  it('accepts the exact bearer secret', () => {
    expect(verifyCronAuthorization(`Bearer ${secret}`, secret)).toBe('ok');
  });

  it('trims accidental whitespace around the configured secret', () => {
    expect(verifyCronAuthorization(`Bearer ${secret}`, ` ${secret}\n`)).toBe('ok');
  });

  it('reports a missing configuration instead of accepting requests', () => {
    expect(verifyCronAuthorization(`Bearer ${secret}`, undefined)).toBe('missing-secret');
    expect(verifyCronAuthorization(`Bearer ${secret}`, '')).toBe('missing-secret');
  });

  it('rejects wrong, missing, and non-bearer credentials', () => {
    expect(verifyCronAuthorization(null, secret)).toBe('unauthorized');
    expect(verifyCronAuthorization('', secret)).toBe('unauthorized');
    expect(verifyCronAuthorization(`Bearer ${secret}x`, secret)).toBe('unauthorized');
    expect(verifyCronAuthorization(`Basic ${secret}`, secret)).toBe('unauthorized');
    expect(verifyCronAuthorization(secret, secret)).toBe('unauthorized');
  });
});

describe('classifyCronCaller', () => {
  it('distinguishes Vercel cron from an external scheduler', () => {
    expect(classifyCronCaller('vercel-cron/1.0')).toBe('cron');
    expect(classifyCronCaller('cron-job.org')).toBe('external');
    expect(classifyCronCaller(null)).toBe('external');
  });
});
