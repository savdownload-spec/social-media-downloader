import { ProviderError, requestJson } from '../../http';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || 'v23.0';
const OAUTH_HOST = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
];

export type MetaCredentials = { id: string; secret: string };

export function metaCredentials(): MetaCredentials {
  const id = process.env.META_APP_ID?.trim();
  const secret = process.env.META_APP_SECRET?.trim();
  if (!id || !secret) {
    throw new ProviderError('Meta app credentials are not configured.', { code: 'PROVIDER_NOT_CONFIGURED' });
  }
  return { id, secret };
}

export function metaAuthorizeUrl(input: { clientId: string; redirectUri: string; state: string }): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    state: input.state,
    response_type: 'code',
    scope: SCOPES.join(','),
  });
  return `${OAUTH_HOST}?${params.toString()}`;
}

export async function metaExchangeCode(input: {
  code: string;
  redirectUri: string;
}): Promise<string> {
  const { id, secret } = metaCredentials();
  const params = new URLSearchParams({
    client_id: id,
    client_secret: secret,
    redirect_uri: input.redirectUri,
    code: input.code,
  });
  const { data } = await requestJson<{ access_token?: string }>(
    `${GRAPH}/oauth/access_token?${params.toString()}`,
  );
  if (!data.access_token) throw new ProviderError('Meta did not return an access token.');
  return data.access_token;
}

export async function metaLongLivedToken(shortToken: string): Promise<{ token: string; expiresIn: number }> {
  const { id, secret } = metaCredentials();
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: id,
    client_secret: secret,
    fb_exchange_token: shortToken,
  });
  const { data } = await requestJson<{ access_token?: string; expires_in?: number }>(
    `${GRAPH}/oauth/access_token?${params.toString()}`,
  );
  if (!data.access_token) throw new ProviderError('Meta did not return a long-lived token.');
  return { token: data.access_token, expiresIn: data.expires_in ?? 60 * 24 * 60 * 60 };
}

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  tasks?: string[];
  instagram_business_account?: {
    id: string;
    username?: string;
    profile_picture_url?: string;
  };
};

export async function metaPages(userToken: string): Promise<MetaPage[]> {
  const params = new URLSearchParams({
    fields:
      'id,name,access_token,tasks,instagram_business_account{id,username,profile_picture_url}',
    limit: '100',
    access_token: userToken,
  });
  const { data } = await requestJson<{ data?: MetaPage[] }>(`${GRAPH}/me/accounts?${params.toString()}`);
  return (data.data ?? []).filter((page) => Boolean(page.access_token));
}

export function metaGraphBase(): string {
  return GRAPH;
}
