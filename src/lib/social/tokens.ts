import type { SocialAccount } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decryptSecret, encryptSecret } from './crypto';

export function metadataOf<T extends Record<string, unknown>>(account: SocialAccount): T {
  return (account.metadata as T) ?? ({} as T);
}

export function accessTokenOf(account: SocialAccount): string {
  if (!account.accessToken) throw new Error('This account has no access token.');
  return decryptSecret(account.accessToken);
}

export function refreshTokenOf(account: SocialAccount): string | null {
  return account.refreshToken ? decryptSecret(account.refreshToken) : null;
}

export function tokenIsExpiring(account: SocialAccount, withinMs = 7 * 24 * 60 * 60 * 1000): boolean {
  if (!account.tokenExpiresAt) return false;
  return account.tokenExpiresAt.getTime() - Date.now() <= withinMs;
}

export function tokenIsExpired(account: SocialAccount): boolean {
  if (!account.tokenExpiresAt) return false;
  return account.tokenExpiresAt.getTime() <= Date.now();
}

export async function saveAccountTokens(
  accountId: string,
  tokens: {
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    status?: string;
    lastError?: string | null;
  },
): Promise<void> {
  await prisma.socialAccount.update({
    where: { id: accountId },
    data: {
      ...(tokens.accessToken !== undefined
        ? { accessToken: tokens.accessToken ? encryptSecret(tokens.accessToken) : null }
        : {}),
      ...(tokens.refreshToken !== undefined
        ? { refreshToken: tokens.refreshToken ? encryptSecret(tokens.refreshToken) : null }
        : {}),
      ...(tokens.expiresAt !== undefined ? { tokenExpiresAt: tokens.expiresAt } : {}),
      ...(tokens.status ? { status: tokens.status } : {}),
      ...(tokens.lastError !== undefined ? { lastError: tokens.lastError } : {}),
    },
  });
}

export async function markAccountStatus(
  accountId: string,
  status: 'CONNECTED' | 'EXPIRING' | 'EXPIRED' | 'ERROR',
  lastError?: string | null,
): Promise<void> {
  await prisma.socialAccount.update({
    where: { id: accountId },
    data: { status, ...(lastError !== undefined ? { lastError } : {}) },
  });
}
