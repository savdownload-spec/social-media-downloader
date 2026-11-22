import { ProviderError, requestJson } from '../../http';

export function normalizeInstanceUrl(input: string): string {
  const value = input.trim();
  let url: URL;
  try {
    url = new URL(value.startsWith('http') ? value : `https://${value}`);
  } catch {
    throw new ProviderError('Enter a valid Mastodon instance URL.');
  }
  const localhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(localhost && url.protocol === 'http:')) {
    throw new ProviderError('The Mastodon instance must use https.');
  }
  return url.origin;
}

export type MastodonProfile = {
  id: string;
  username: string;
  acct: string;
  display_name?: string;
  avatar?: string;
  url?: string;
};

export async function mastodonVerify(input: {
  instance: string;
  accessToken: string;
}): Promise<MastodonProfile> {
  const instance = normalizeInstanceUrl(input.instance);
  const { data } = await requestJson<MastodonProfile>(
    `${instance}/api/v1/accounts/verify_credentials`,
    { headers: { Authorization: `Bearer ${input.accessToken}` } },
  );
  if (!data.id) throw new ProviderError('Mastodon did not return an account.');
  return data;
}
