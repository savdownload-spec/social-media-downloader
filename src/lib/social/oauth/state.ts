import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export function hashState(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function newStateValue(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Creates a one-time, hashed OAuth state row bound to the initiating admin and
 * the exact callback URI used for the token exchange.
 */
export async function createOAuthState(input: {
  platform: string;
  adminId: string;
  callbackUri: string;
}): Promise<string> {
  const raw = newStateValue();
  await prisma.socialOAuthState
    .deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
    .catch(() => null);
  await prisma.socialOAuthState.create({
    data: {
      stateHash: hashState(raw),
      platform: input.platform,
      adminId: input.adminId,
      redirectTo: input.callbackUri,
      expiresAt: new Date(Date.now() + OAUTH_STATE_TTL_MS),
    },
  });
  return raw;
}

export async function consumeOAuthState(input: {
  raw: string | null;
  platform: string;
  adminId: string;
}) {
  if (!input.raw) return null;
  const row = await prisma.socialOAuthState.findUnique({
    where: { stateHash: hashState(input.raw) },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) return null;
  if (row.platform !== input.platform || row.adminId !== input.adminId) return null;
  await prisma.socialOAuthState.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row;
}

/** Derives the public callback origin, preferring an explicit override. */
export function oauthBaseUrl(requestUrl: string): string {
  const configured = process.env.SOCIAL_OAUTH_BASE_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through to the request origin
    }
  }
  return new URL(requestUrl).origin;
}
