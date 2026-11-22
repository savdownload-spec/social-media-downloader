import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, scrubSecrets } from './crypto';

const KEY = Buffer.alloc(32, 7).toString('base64');

describe('social token crypto', () => {
  const previous = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = KEY;
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    else process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = previous;
  });

  it('round-trips a token through AES-256-GCM', () => {
    const cipher = encryptSecret('EAAG-secret-token');
    expect(cipher.startsWith('v1:')).toBe(true);
    expect(cipher).not.toContain('EAAG-secret-token');
    expect(decryptSecret(cipher)).toBe('EAAG-secret-token');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  it('rejects tampered ciphertext', () => {
    const cipher = encryptSecret('token');
    const parts = cipher.split(':');
    const data = Buffer.from(parts[3], 'base64');
    data[0] ^= 0xff;
    const tampered = [parts[0], parts[1], parts[2], data.toString('base64')].join(':');
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('fails closed when the key is missing or the wrong length', () => {
    delete process.env.SOCIAL_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptSecret('x')).toThrow(/SOCIAL_TOKEN_ENCRYPTION_KEY/);
    process.env.SOCIAL_TOKEN_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64');
    expect(() => encryptSecret('x')).toThrow(/32 bytes/);
  });

  it('scrubs credentials from arbitrary payloads', () => {
    const scrubbed = scrubSecrets({
      access_token: 'abc',
      nested: { refreshToken: 'def' },
      message: 'Bearer eyJhbGciOi.payload.sig',
      ok: 1,
    });
    expect(scrubbed.access_token).toBe('[redacted]');
    expect(scrubbed.nested.refreshToken).toBe('[redacted]');
    expect(scrubbed.message).toContain('[redacted]');
    expect(scrubbed.ok).toBe(1);
  });
});
