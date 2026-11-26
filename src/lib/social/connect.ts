import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/admin';
import type { SocialActor } from './api-auth';
import { encryptSecret } from './crypto';
import { ProviderError } from './http';
import { metaExchangeCode, metaLongLivedToken, metaPages } from './oauth/providers/meta';
import { linkedinExchangeCode, linkedinUserinfo } from './oauth/providers/linkedin';
import { pinterestBoards, pinterestExchangeCode, pinterestUser } from './oauth/providers/pinterest';
import { blueskyCreateSession } from './oauth/providers/bluesky';
import { mastodonVerify, normalizeInstanceUrl } from './oauth/providers/mastodon';

type AccountInput = {
  platform: string;
  externalAccountId: string;
  accountName: string;
  username?: string | null;
  avatarUrl?: string | null;
  accountType: string;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string | null;
  metadata: Prisma.InputJsonValue;
};

async function upsertAccount(input: AccountInput) {
  const now = new Date();
  return prisma.socialAccount.upsert({
    where: {
      platform_externalAccountId: {
        platform: input.platform,
        externalAccountId: input.externalAccountId,
      },
    },
    update: {
      accountName: input.accountName,
      username: input.username ?? null,
      avatarUrl: input.avatarUrl ?? null,
      accountType: input.accountType,
      accessToken: encryptSecret(input.accessToken),
      refreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      scopes: input.scopes ?? null,
      status: 'CONNECTED',
      metadata: input.metadata,
      lastConnectedAt: now,
      lastError: null,
    },
    create: {
      platform: input.platform,
      externalAccountId: input.externalAccountId,
      accountName: input.accountName,
      username: input.username ?? null,
      avatarUrl: input.avatarUrl ?? null,
      accountType: input.accountType,
      accessToken: encryptSecret(input.accessToken),
      refreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      scopes: input.scopes ?? null,
      status: 'CONNECTED',
      metadata: input.metadata,
      lastConnectedAt: now,
    },
  });
}

/** Connects the Facebook Pages and linked Instagram professional accounts. */
export async function connectMeta(actor: SocialActor, code: string, redirectUri: string) {
  const shortToken = await metaExchangeCode({ code, redirectUri });
  const longLived = await metaLongLivedToken(shortToken);
  const pages = await metaPages(longLived.token);
  if (pages.length === 0) {
    throw new ProviderError('No Facebook Pages are available for this account.');
  }

  let facebook = 0;
  let instagram = 0;
  for (const page of pages) {
    await upsertAccount({
      platform: 'FACEBOOK',
      externalAccountId: page.id,
      accountName: page.name,
      username: null,
      avatarUrl: null,
      accountType: 'PAGE',
      accessToken: page.access_token,
      tokenExpiresAt: null,
      scopes: 'pages_manage_posts,pages_read_engagement',
      metadata: { pageId: page.id, pageName: page.name, tasks: page.tasks ?? [] },
    });
    facebook += 1;

    const ig = page.instagram_business_account;
    if (ig?.id) {
      await upsertAccount({
        platform: 'INSTAGRAM',
        externalAccountId: ig.id,
        accountName: ig.username ? `@${ig.username}` : page.name,
        username: ig.username ?? null,
        avatarUrl: ig.profile_picture_url ?? null,
        accountType: 'PROFESSIONAL',
        accessToken: page.access_token,
        tokenExpiresAt: null,
        scopes: 'instagram_basic,instagram_content_publish',
        metadata: {
          igUserId: ig.id,
          pageId: page.id,
          pageName: page.name,
          username: ig.username ?? null,
        },
      });
      instagram += 1;
    }
  }

  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'social.account.connect',
    targetType: 'SocialAccount',
    targetId: 'meta',
    detail: { platform: 'META', facebook, instagram },
  });

  return { facebook, instagram };
}

export async function connectLinkedIn(actor: SocialActor, code: string, redirectUri: string) {
  const token = await linkedinExchangeCode({ code, redirectUri });
  const profile = await linkedinUserinfo(token.accessToken);
  const account = await upsertAccount({
    platform: 'LINKEDIN',
    externalAccountId: profile.sub,
    accountName: profile.name ?? profile.given_name ?? 'LinkedIn member',
    username: profile.email ?? null,
    avatarUrl: profile.picture ?? null,
    accountType: 'MEMBER',
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    tokenExpiresAt: new Date(Date.now() + token.expiresIn * 1000),
    scopes: 'openid profile w_member_social',
    metadata: { sub: profile.sub, personUrn: `urn:li:person:${profile.sub}` },
  });

  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'social.account.connect',
    targetType: 'SocialAccount',
    targetId: account.id,
    detail: { platform: 'LINKEDIN' },
  });

  return account;
}

export async function connectPinterest(actor: SocialActor, code: string, redirectUri: string) {
  const token = await pinterestExchangeCode({ code, redirectUri });
  const [user, boards] = await Promise.all([
    pinterestUser(token.accessToken),
    pinterestBoards(token.accessToken).catch(() => []),
  ]);
  const username = user.username ?? 'pinterest-account';
  const account = await upsertAccount({
    platform: 'PINTEREST',
    externalAccountId: username,
    accountName: username,
    username,
    avatarUrl: user.profile_image ?? null,
    accountType: user.account_type ?? 'BUSINESS',
    accessToken: token.accessToken,
    refreshToken: token.refreshToken,
    tokenExpiresAt: new Date(Date.now() + token.expiresIn * 1000),
    scopes: 'boards:read,pins:read,pins:write,user_accounts:read',
    metadata: { username, boards },
  });

  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'social.account.connect',
    targetType: 'SocialAccount',
    targetId: account.id,
    detail: { platform: 'PINTEREST', boards: boards.length },
  });

  return account;
}

export async function connectBluesky(
  actor: SocialActor,
  input: { handle: string; appPassword: string; pds?: string | null },
) {
  const session = await blueskyCreateSession({
    identifier: input.handle,
    password: input.appPassword,
    pds: input.pds,
  });
  const account = await upsertAccount({
    platform: 'BLUESKY',
    externalAccountId: session.did,
    accountName: session.handle,
    username: session.handle,
    avatarUrl: null,
    accountType: 'ACCOUNT',
    accessToken: session.accessJwt,
    refreshToken: session.refreshJwt,
    // Access JWTs are short-lived; the adapter refreshes them automatically.
    tokenExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    scopes: 'atproto',
    metadata: { did: session.did, handle: session.handle, pds: session.pds },
  });

  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'social.account.connect',
    targetType: 'SocialAccount',
    targetId: account.id,
    detail: { platform: 'BLUESKY' },
  });

  return account;
}

export async function connectMastodon(
  actor: SocialActor,
  input: { instance: string; accessToken: string },
) {
  const instance = normalizeInstanceUrl(input.instance);
  const profile = await mastodonVerify({ instance, accessToken: input.accessToken });
  const account = await upsertAccount({
    platform: 'MASTODON',
    // Mastodon ids are only unique per instance, so scope the dedupe key.
    externalAccountId: `${instance}#${profile.id}`,
    accountName: profile.display_name || profile.username,
    username: profile.acct,
    avatarUrl: profile.avatar ?? null,
    accountType: 'ACCOUNT',
    accessToken: input.accessToken,
    tokenExpiresAt: null,
    scopes: 'write',
    metadata: {
      instance,
      profileUrl: profile.url ?? null,
      username: profile.username,
    },
  });

  await writeAuditLog({
    adminId: actor.id,
    adminEmail: actor.email,
    action: 'social.account.connect',
    targetType: 'SocialAccount',
    targetId: account.id,
    detail: { platform: 'MASTODON', instance },
  });

  return account;
}

/** Best-effort revocation before a connection row is removed. */
export async function revokeAccount(account: {
  platform: string;
  accessToken: string | null;
  refreshToken: string | null;
  metadata: unknown;
}): Promise<void> {
  try {
    const meta = (account.metadata ?? {}) as Record<string, unknown>;
    if (account.platform === 'BLUESKY' && account.refreshToken) {
      const { decryptSecret } = await import('./crypto');
      const { requestJson } = await import('./http');
      const { normalizePds } = await import('./oauth/providers/bluesky');
      const pds = normalizePds(typeof meta.pds === 'string' ? meta.pds : null);
      await requestJson(`${pds}/xrpc/com.atproto.server.deleteSession`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${decryptSecret(account.refreshToken)}` },
      }).catch(() => null);
    }
    if (account.platform === 'MASTODON' && account.accessToken) {
      const { decryptSecret } = await import('./crypto');
      const { requestJson } = await import('./http');
      const instance = normalizeInstanceUrl(String(meta.instance ?? ''));
      await requestJson(`${instance}/oauth/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: decryptSecret(account.accessToken) }).toString(),
      }).catch(() => null);
    }
  } catch {
    // revocation is best-effort; the local ciphertext is removed regardless
  }
}
