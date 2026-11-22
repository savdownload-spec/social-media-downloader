import { NextResponse } from 'next/server';
import { resolveSocialActor, socialError } from '@/lib/social/api-auth';
import { roleCan } from '@/lib/social/permissions';
import { consumeOAuthState, oauthBaseUrl } from '@/lib/social/oauth/state';
import { connectLinkedIn, connectMeta, connectPinterest } from '@/lib/social/connect';
import { ProviderError } from '@/lib/social/http';
import type { SocialActor } from '@/lib/social/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORTED = new Set(['meta', 'linkedin', 'pinterest']);

function back(request: Request, params: Record<string, string>) {
  const url = new URL('/admin/social/accounts', oauthBaseUrl(request.url));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}

function summary(provider: string, result: unknown): string {
  if (provider === 'meta') {
    const counts = result as { facebook: number; instagram: number };
    return `Connected ${counts.facebook} Page${counts.facebook === 1 ? '' : 's'} and ${counts.instagram} Instagram account${counts.instagram === 1 ? '' : 's'}.`;
  }
  return `${provider === 'linkedin' ? 'LinkedIn' : 'Pinterest'} account connected.`;
}

export async function GET(request: Request, { params }: { params: { provider: string } }) {
  const provider = params.provider;
  if (!SUPPORTED.has(provider)) return socialError('Unsupported connection.', 404);

  // The browser lands here as a top-level navigation, so the fetch-only
  // origin check in requireSocialApi is not applicable; re-check the session.
  const actor: SocialActor | null = await resolveSocialActor(request);
  if (!actor) return back(request, { error: 'Sign in as an administrator to finish connecting.' });
  if (!roleCan(actor.role, 'accounts')) {
    return back(request, { error: 'Your social role cannot manage connected accounts.' });
  }

  const url = new URL(request.url);
  const denied = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (denied) return back(request, { error: denied });

  const code = url.searchParams.get('code');
  const state = await consumeOAuthState({
    raw: url.searchParams.get('state'),
    platform: provider,
    adminId: actor.id,
  });
  if (!code || !state) {
    return back(request, {
      error: 'This connection link is invalid or expired. Start the connection again.',
    });
  }

  try {
    const redirectUri =
      state.redirectTo ?? `${oauthBaseUrl(request.url)}/api/admin/social/oauth/${provider}/callback`;
    let result: unknown;
    if (provider === 'meta') result = await connectMeta(actor, code, redirectUri);
    else if (provider === 'linkedin') result = await connectLinkedIn(actor, code, redirectUri);
    else result = await connectPinterest(actor, code, redirectUri);
    return back(request, { connected: summary(provider, result) });
  } catch (error) {
    const message =
      error instanceof ProviderError
        ? error.message
        : 'The provider did not complete the connection. Check its Setup instructions and try again.';
    return back(request, { error: message });
  }
}
