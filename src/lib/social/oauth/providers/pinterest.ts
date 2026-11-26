import { ProviderError, requestJson } from '../../http';

const AUTHORIZE_URL = 'https://www.pinterest.com/oauth/';
const TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token';
const API = 'https://api.pinterest.com/v5';
const SCOPES = ['boards:read', 'pins:read', 'pins:write', 'user_accounts:read'];

export function pinterestCredentials(): { id: string; secret: string } {
  const id = process.env.PINTEREST_APP_ID?.trim();
  const secret = process.env.PINTEREST_APP_SECRET?.trim();
  if (!id || !secret) {
    throw new ProviderError('Pinterest app credentials are not configured.', {
      code: 'PROVIDER_NOT_CONFIGURED',
    });
  }
  return { id, secret };
}

export function pinterestAuthorizeUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: SCOPES.join(','),
    state: input.state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

function basicAuth(): string {
  const { id, secret } = pinterestCredentials();
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
}

export type PinterestToken = {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
};

export async function pinterestExchangeCode(input: {
  code: string;
  redirectUri: string;
}): Promise<PinterestToken> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    redirect_uri: input.redirectUri,
  });
  const { data } = await requestJson<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }>(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!data.access_token) throw new ProviderError('Pinterest did not return an access token.');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? 30 * 24 * 60 * 60,
  };
}

export async function pinterestRefresh(refreshToken: string): Promise<PinterestToken> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const { data } = await requestJson<{
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  }>(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  if (!data.access_token) throw new ProviderError('Pinterest token refresh failed.');
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in ?? 30 * 24 * 60 * 60,
  };
}

export type PinterestUser = {
  username?: string;
  account_type?: string;
  profile_image?: string;
};

export async function pinterestUser(accessToken: string): Promise<PinterestUser> {
  const { data } = await requestJson<PinterestUser>(`${API}/user_account`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

export type PinterestBoard = { id: string; name: string };

export async function pinterestBoards(accessToken: string): Promise<PinterestBoard[]> {
  const { data } = await requestJson<{ items?: PinterestBoard[] }>(
    `${API}/boards?page_size=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return (data.items ?? []).map((board) => ({ id: board.id, name: board.name }));
}

export function pinterestApiBase(): string {
  return API;
}
