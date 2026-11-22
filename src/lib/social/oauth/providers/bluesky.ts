import { ProviderError, requestJson } from '../../http';

export const BSKY_DEFAULT_PDS = 'https://bsky.social';

type DidDoc = {
  service?: Array<{ id?: string; type?: string; serviceEndpoint?: string }>;
};

export type BlueskySession = {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
  pds: string;
};

export function pdsFromDidDoc(didDoc?: DidDoc): string {
  const endpoint = didDoc?.service?.find((service) => service.id === '#atproto_pds')?.serviceEndpoint;
  if (endpoint) {
    try {
      return new URL(endpoint).origin;
    } catch {
      // fall through
    }
  }
  return BSKY_DEFAULT_PDS;
}

export function normalizePds(input?: string | null): string {
  const value = input?.trim();
  if (!value) return BSKY_DEFAULT_PDS;
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new ProviderError('The PDS URL must use https.');
  return url.origin;
}

export async function blueskyCreateSession(input: {
  identifier: string;
  password: string;
  pds?: string | null;
}): Promise<BlueskySession> {
  const pds = normalizePds(input.pds);
  const { data } = await requestJson<{
    did?: string;
    handle?: string;
    accessJwt?: string;
    refreshJwt?: string;
    didDoc?: DidDoc;
  }>(`${pds}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: input.identifier, password: input.password }),
  });
  if (!data.accessJwt || !data.refreshJwt || !data.did) {
    throw new ProviderError('Bluesky did not return a session.');
  }
  return {
    did: data.did,
    handle: data.handle ?? input.identifier,
    accessJwt: data.accessJwt,
    refreshJwt: data.refreshJwt,
    pds: pdsFromDidDoc(data.didDoc) || pds,
  };
}

export async function blueskyRefresh(input: {
  pds: string;
  refreshJwt: string;
}): Promise<{ accessJwt: string; refreshJwt: string }> {
  const { data } = await requestJson<{ accessJwt?: string; refreshJwt?: string }>(
    `${input.pds}/xrpc/com.atproto.server.refreshSession`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${input.refreshJwt}` },
    },
  );
  if (!data.accessJwt || !data.refreshJwt) throw new ProviderError('Bluesky session refresh failed.');
  return { accessJwt: data.accessJwt, refreshJwt: data.refreshJwt };
}
