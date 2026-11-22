import { isAuthError, ProviderError, requestJson } from '../http';
import { freshAccessToken, markReauthNeeded, ReconnectRequiredError } from '../refresh';
import { normalizePds } from '../oauth/providers/bluesky';
import type { PlatformAdapter } from './index';
import { assetBytes, failed, imageAssets, needsAuth, variantText, videoAssets } from './util';

const TEXT_LIMIT = 300;
const MAX_IMAGES = 4;

type Facet = {
  index: { byteStart: number; byteEnd: number };
  features: Array<{ $type: string; uri?: string }>;
};

function truncateGraphemes(value: string, limit: number): string {
  const characters = Array.from(value);
  return characters.length <= limit ? value : `${characters.slice(0, limit - 1).join('')}…`;
}

/** Link facets need UTF-8 byte offsets, not character indexes. */
export function linkFacets(text: string): Facet[] {
  const encoder = new TextEncoder();
  const facets: Facet[] = [];
  const pattern = /https?:\/\/[^\s]+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    facets.push({
      index: {
        byteStart: encoder.encode(text.slice(0, start)).length,
        byteEnd: encoder.encode(text.slice(0, end)).length,
      },
      features: [{ $type: 'app.bsky.richtext.facet#link', uri: match[0] }],
    });
  }
  return facets;
}

type BlobRef = { $type: string; ref: unknown; mimeType: string; size: number };

export const blueskyAdapter: PlatformAdapter = async (context) => {
  const account = context.account;
  if (!account) return needsAuth('Connect a Bluesky account before publishing.');

  if (videoAssets(context).length > 0) {
    return failed('Bluesky video uploads need asynchronous processing and are not enabled yet.', 'MEDIA_TYPE');
  }
  const images = imageAssets(context);
  if (images.length > MAX_IMAGES) {
    return failed(`Bluesky accepts at most ${MAX_IMAGES} images per post.`, 'MEDIA_COUNT');
  }

  let token: string;
  try {
    token = await freshAccessToken(account);
  } catch (error) {
    if (error instanceof ReconnectRequiredError) return needsAuth(error.message);
    throw error;
  }

  const meta = (account.metadata as Record<string, unknown> | null) ?? {};
  const pds = normalizePds(typeof meta.pds === 'string' ? meta.pds : null);
  const did = typeof meta.did === 'string' ? meta.did : account.externalAccountId;
  const handle = typeof meta.handle === 'string' ? meta.handle : account.username ?? did;

  try {
    const uploaded: BlobRef[] = [];
    for (const image of images) {
      const { buffer, contentType } = await assetBytes(image);
      const { data } = await requestJson<{ blob?: BlobRef }>(`${pds}/xrpc/com.atproto.repo.uploadBlob`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType || image.mimeType,
        },
        body: new Uint8Array(buffer),
      });
      if (!data.blob) throw new ProviderError('Bluesky did not store the image.');
      uploaded.push(data.blob);
    }

    const text = truncateGraphemes(variantText(context), TEXT_LIMIT);
    if (!text) return failed('Bluesky requires post text.', 'TEXT_REQUIRED');

    const record: Record<string, unknown> = {
      $type: 'app.bsky.feed.post',
      text,
      createdAt: new Date().toISOString(),
    };
    const facets = linkFacets(text);
    if (facets.length > 0) record.facets = facets;
    if (uploaded.length > 0) {
      record.embed = {
        $type: 'app.bsky.embed.images',
        images: uploaded.map((blob, index) => ({
          image: blob,
          alt: images[index]?.altText?.slice(0, 1000) ?? '',
        })),
      };
    }

    const { data } = await requestJson<{ uri?: string; cid?: string }>(
      `${pds}/xrpc/com.atproto.repo.createRecord`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: did, collection: 'app.bsky.feed.post', record }),
      },
    );
    if (!data.uri) return failed('Bluesky did not confirm the post.');
    const rkey = data.uri.split('/').pop();

    return {
      outcome: 'PUBLISHED',
      remotePostId: data.uri,
      ...(rkey ? { publishedUrl: `https://bsky.app/profile/${handle}/post/${rkey}` } : {}),
      providerResponse: { uri: data.uri, cid: data.cid ?? null },
    };
  } catch (error) {
    if (isAuthError(error)) {
      const text = 'Bluesky rejected the session. Add a new App Password.';
      await markReauthNeeded(account.id, text);
      return needsAuth(text);
    }
    if (error instanceof Error) return failed(error.message.slice(0, 400));
    return failed('The Bluesky request failed.');
  }
};
