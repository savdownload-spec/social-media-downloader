import { ProviderError, requestJson } from '../../http';

const AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
const SCOPES = ['openid', 'profile', 'w_member_social'];

export function linkedinCredentials(): { id: string; secret: string } {
  const id = process.env.LINKEDIN_CLIENT_ID?.trim();
  const secret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
  if (!id || !secret) {
    throw new ProviderError('LinkedIn app credentials are not configured.', { code: 'PROVIDER_NOT_CONFIGURED' });
  }
  return { id, secret };
}

export function linkedinAuthorizeUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    state: input.state,
    scope: SCOPES.join(' '),
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export type LinkedInToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
};

export async function linkedinExchangeCode(input: {
  code: string;
  redirectUri: string;
}): Promise<LinkedInToken> {
  const { id, secret } = linkedinCredentials();
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
    client_id: id,
    client_secret: secret,
  });
  const { data } = await requestJson<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }>(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!data.access_token) throw new ProviderError('LinkedIn did not return an access token.');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? 60 * 24 * 60 * 60,
  };
}

export async function linkedinRefresh(refreshToken: string): Promise<LinkedInToken> {
  const { id, secret } = linkedinCredentials();
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: id,
    client_secret: secret,
  });
  const { data } = await requestJson<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }>(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!data.access_token) throw new ProviderError('LinkedIn token refresh failed.');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in ?? 60 * 24 * 60 * 60,
  };
}

export type LinkedInProfile = {
  sub: string;
  name?: string;
  given_name?: string;
  picture?: string;
  email?: string;
};

export async function linkedinUserinfo(accessToken: string): Promise<LinkedInProfile> {
  const { data } = await requestJson<LinkedInProfile>(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!data.sub) throw new ProviderError('LinkedIn did not return a member id.');
  return data;
}
