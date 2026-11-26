import crypto from 'crypto';

export type CronAuthResult = 'ok' | 'missing-secret' | 'unauthorized';

/**
 * Validates the `Authorization: Bearer <CRON_SECRET>` header Vercel adds to
 * scheduled invocations. Comparison is length-checked and timing-safe; the
 * secret is never logged or returned.
 */
export function verifyCronAuthorization(
  authorization: string | null | undefined,
  secret: string | undefined = process.env.CRON_SECRET,
): CronAuthResult {
  const expected = secret?.trim();
  if (!expected) return 'missing-secret';
  if (!authorization) return 'unauthorized';
  const prefix = 'Bearer ';
  if (!authorization.startsWith(prefix)) return 'unauthorized';
  const provided = authorization.slice(prefix.length);
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return 'unauthorized';
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer) ? 'ok' : 'unauthorized';
}

export function classifyCronCaller(userAgent: string | null | undefined): 'cron' | 'external' {
  return userAgent && /vercel-cron/i.test(userAgent) ? 'cron' : 'external';
}
