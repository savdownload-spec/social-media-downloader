import type { SocialAccount } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { accessTokenOf, refreshTokenOf, saveAccountTokens, tokenIsExpired, tokenIsExpiring } from './tokens';
import { linkedinRefresh } from './oauth/providers/linkedin';
import { pinterestRefresh } from './oauth/providers/pinterest';
import { blueskyRefresh, normalizePds } from './oauth/providers/bluesky';

/** Thrown when a connection must be renewed by a human before publishing. */
export class ReconnectRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReconnectRequiredError';
  }
}

function metadata(account: SocialAccount): Record<string, unknown> {
  return (account.metadata as Record<string, unknown> | null) ?? {};
}

/** Refresh just ahead of expiry rather than on every call; refresh tokens rotate. */
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

/**
 * Returns a usable access token, refreshing where the provider allows it and
 * persisting the rotated ciphertext. Facebook Page/Instagram/Mastodon tokens
 * have no refresh flow, so those surface as ReconnectRequiredError instead.
 */
export async function freshAccessToken(account: SocialAccount): Promise<string> {
  const expired = tokenIsExpired(account);
  const expiring = tokenIsExpiring(account, REFRESH_WINDOW_MS);

  if (account.platform === 'LINKEDIN' && (expired || expiring)) {
    const refresh = refreshTokenOf(account);
    if (!refresh) throw new ReconnectRequiredError('The LinkedIn token expired. Reconnect the account.');
    const token = await linkedinRefresh(refresh);
    await saveAccountTokens(account.id, {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: new Date(Date.now() + token.expiresIn * 1000),
      status: 'CONNECTED',
      lastError: null,
    });
    return token.accessToken;
  }

  if (account.platform === 'PINTEREST' && (expired || expiring)) {
    const refresh = refreshTokenOf(account);
    if (!refresh) throw new ReconnectRequiredError('The Pinterest token expired. Reconnect the account.');
    const token = await pinterestRefresh(refresh);
    await saveAccountTokens(account.id, {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: new Date(Date.now() + token.expiresIn * 1000),
      status: 'CONNECTED',
      lastError: null,
    });
    return token.accessToken;
  }

  if (account.platform === 'BLUESKY' && (expired || expiring)) {
    const refresh = refreshTokenOf(account);
    if (!refresh) throw new ReconnectRequiredError('The Bluesky session expired. Add a new App Password.');
    const pds = normalizePds(typeof metadata(account).pds === 'string' ? (metadata(account).pds as string) : null);
    const session = await blueskyRefresh({ pds, refreshJwt: refresh });
    await saveAccountTokens(account.id, {
      accessToken: session.accessJwt,
      refreshToken: session.refreshJwt,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: 'CONNECTED',
      lastError: null,
    });
    return session.accessJwt;
  }

  if (expired) {
    throw new ReconnectRequiredError(`The ${account.platform.toLowerCase()} connection expired. Reconnect the account.`);
  }
  return accessTokenOf(account);
}

/** Marks the account EXPIRED when the provider rejects its token. */
export async function markReauthNeeded(accountId: string, message: string): Promise<void> {
  await prisma.socialAccount
    .update({
      where: { id: accountId },
      data: { status: 'EXPIRED', lastError: message.slice(0, 400) },
    })
    .catch(() => null);
}
