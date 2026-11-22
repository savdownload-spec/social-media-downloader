import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { revokeAccount } from '@/lib/social/connect';
import { PLATFORMS, PLATFORM_IDS } from '@/lib/social/platforms';
import { PROVIDER_SETUP, isProviderConfigured } from '@/lib/social/providers';
import { oauthBaseUrl } from '@/lib/social/oauth/state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSocialApi(request, 'view');
  if (!auth.ok) return auth.response;

  const accounts = await prisma.socialAccount.findMany({
    orderBy: [{ platform: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      platform: true,
      externalAccountId: true,
      accountName: true,
      username: true,
      avatarUrl: true,
      accountType: true,
      status: true,
      tokenExpiresAt: true,
      scopes: true,
      metadata: true,
      lastConnectedAt: true,
      lastPublishedAt: true,
      lastError: true,
      createdAt: true,
    },
  });

  const expiringSoon = Date.now() + 7 * 24 * 60 * 60 * 1000;
  return NextResponse.json(
    {
      ok: true,
      data: {
        accounts: accounts.map((account) => ({
          ...account,
          status:
            account.status === 'CONNECTED' &&
            account.tokenExpiresAt &&
            account.tokenExpiresAt.getTime() <= expiringSoon
              ? 'EXPIRING'
              : account.status,
          tokenExpiresAt: account.tokenExpiresAt?.toISOString() ?? null,
          lastConnectedAt: account.lastConnectedAt?.toISOString() ?? null,
          lastPublishedAt: account.lastPublishedAt?.toISOString() ?? null,
          createdAt: account.createdAt.toISOString(),
        })),
        platforms: PLATFORMS,
        providers: PLATFORM_IDS.map((platform) => ({
          platform,
          ...PROVIDER_SETUP[platform],
          configured: isProviderConfigured(platform),
        })),
        callbackOrigin: oauthBaseUrl(request.url),
      },
    },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSocialApi(request, 'accounts');
  if (!auth.ok) return auth.response;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return socialError('Missing account id.', 400);

  const account = await prisma.socialAccount.findUnique({
    where: { id },
    select: {
      id: true,
      platform: true,
      accountName: true,
      accessToken: true,
      refreshToken: true,
      metadata: true,
    },
  });
  if (!account) return socialError('Account not found.', 404);

  await revokeAccount(account);
  await prisma.socialAccount.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      adminId: auth.actor.id,
      adminEmail: auth.actor.email,
      action: 'social.account.disconnect',
      targetType: 'SocialAccount',
      targetId: id,
      detail: { platform: account.platform, accountName: account.accountName },
    },
  });

  return NextResponse.json({ ok: true }, { headers: SOCIAL_NO_STORE_HEADERS });
}
