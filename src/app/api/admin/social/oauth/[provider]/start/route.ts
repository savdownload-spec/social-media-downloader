import { NextResponse } from 'next/server';
import { requireSocialApi, type SocialActor } from '@/lib/social/api-auth';
import { createOAuthState, oauthBaseUrl } from '@/lib/social/oauth/state';
import { linkedinAuthorizeUrl, linkedinCredentials } from '@/lib/social/oauth/providers/linkedin';
import { metaAuthorizeUrl, metaCredentials } from '@/lib/social/oauth/providers/meta';
import { pinterestAuthorizeUrl, pinterestCredentials } from '@/lib/social/oauth/providers/pinterest';
import { isProviderConfigured } from '@/lib/social/providers';
import type { PlatformId } from '@/lib/social/platforms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROVIDER_PLATFORM: Record<string, PlatformId> = {
  meta: 'FACEBOOK',
  facebook: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  linkedin: 'LINKEDIN',
  pinterest: 'PINTEREST',
};

function accountsRedirect(request: Request, params: Record<string, string>) {
  const url = new URL('/admin/social/accounts', oauthBaseUrl(request.url));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

function authorizeUrl(provider: string, input: { redirectUri: string; state: string }): string {
  if (provider === 'meta') {
    return metaAuthorizeUrl({ clientId: metaCredentials().id, ...input });
  }
  if (provider === 'linkedin') {
    return linkedinAuthorizeUrl({ clientId: linkedinCredentials().id, ...input });
  }
  if (provider === 'pinterest') {
    return pinterestAuthorizeUrl({ clientId: pinterestCredentials().id, ...input });
  }
  throw new Error(`Unknown provider: ${provider}`);
}

export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const platform = PROVIDER_PLATFORM[params.provider];
  if (!platform) {
    return NextResponse.json({ ok: false, error: 'Unsupported connection.' }, { status: 404 });
  }

  const auth = await requireSocialApi(request, 'accounts');
  if (!auth.ok) return auth.response;
  const actor: SocialActor = auth.actor;

  if (!isProviderConfigured(platform)) {
    return accountsRedirect(request, {
      error: `${params.provider} is not configured on this deployment yet. Add the app credentials shown under Setup first.`,
    });
  }

  const callbackUri = `${oauthBaseUrl(request.url)}/api/admin/social/oauth/${params.provider}/callback`;
  const state = await createOAuthState({
    platform: params.provider,
    adminId: actor.id,
    callbackUri,
  });

  return NextResponse.redirect(authorizeUrl(params.provider, { redirectUri: callbackUri, state }));
}
