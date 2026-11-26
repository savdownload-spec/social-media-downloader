import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM envelope for social account tokens.
 *
 * Format: `v1:<iv b64>:<tag b64>:<ciphertext b64>`.
 * The 32-byte key comes from SOCIAL_TOKEN_ENCRYPTION_KEY (base64). Tokens are
 * decrypted only inside server-side publishing/refresh code and never enter a
 * JSON response, log line, or error message.
 */

const VERSION = 'v1';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class SocialCryptoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SocialCryptoConfigError';
  }
}

function loadKey(): Buffer {
  const raw = process.env.SOCIAL_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new SocialCryptoConfigError(
      'SOCIAL_TOKEN_ENCRYPTION_KEY is not configured. Generate one with: openssl rand -base64 32',
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new SocialCryptoConfigError('SOCIAL_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (base64).');
  }
  return key;
}

export function isTokenEncryptionConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('Unrecognised secret envelope.');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv('aes-256-gcm', loadKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return plaintext.toString('utf8');
}

/** Remove anything that looks like a credential before persisting/logging. */
export function scrubSecrets<T>(value: T): T {
  if (typeof value === 'string') {
    return value
      .replace(/(access_token|refresh_token|client_secret|authorization)["']?\s*[:=]\s*["']?[^"',}\s]+/gi, '$1=[redacted]')
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]') as unknown as T;
  }
  if (Array.isArray(value)) return value.map((item) => scrubSecrets(item)) as unknown as T;
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (/token|secret|password|authorization/i.test(key)) {
        output[key] = '[redacted]';
      } else {
        output[key] = scrubSecrets(item);
      }
    }
    return output as T;
  }
  return value;
}
