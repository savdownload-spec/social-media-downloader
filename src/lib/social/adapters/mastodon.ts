import { isAuthError, ProviderError, requestJson } from '../http';
import { freshAccessToken, markReauthNeeded, ReconnectRequiredError } from '../refresh';
import { normalizeInstanceUrl } from '../oauth/providers/mastodon';
import type { PlatformAdapter } from './index';
import { assetBytes, failed, imageAssets, needsAuth, truncate, variantText, videoAssets } from './util';

const TEXT_LIMIT = 500;
const MAX_IMAGES = 4;

async function uploadMedia(
  instance: string,
  token: string,
  image: { mimeType: string; altText: string | null; id: string },
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const form = new FormData();
  form.set('file', new Blob([new Uint8Array(buffer)], { type: contentType || image.mimeType }), `image-${image.id}`);
  if (image.altText) form.set('description', image.altText.slice(0, 1500));

  const response = await fetch(`${instance}/api/v2/media`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  if (!response.ok || !payload?.id) {
    throw new ProviderError(`Mastodon media upload failed (HTTP ${response.status}).`, { status: response.status });
  }
  return payload.id;
}

export const mastodonAdapter: PlatformAdapter = async (context) => {
  const account = context.account;
  if (!account) return needsAuth('Connect a Mastodon account before publishing.');

  if (videoAssets(context).length > 0) {
    return failed('Mastodon video uploads are not enabled in this build.', 'MEDIA_TYPE');
  }
  const images = imageAssets(context);
  if (images.length > MAX_IMAGES) {
    return failed(`Mastodon accepts at most ${MAX_IMAGES} images per post.`, 'MEDIA_COUNT');
  }

  let token: string;
  try {
    token = await freshAccessToken(account);
  } catch (error) {
    if (error instanceof ReconnectRequiredError) return needsAuth(error.message);
    throw error;
  }

  const meta = (account.metadata as Record<string, unknown> | null) ?? {};

  try {
    const instance = normalizeInstanceUrl(typeof meta.instance === 'string' ? meta.instance : '');
    const mediaIds: string[] = [];
    for (const image of images) {
      const { buffer, contentType } = await assetBytes(image);
      mediaIds.push(await uploadMedia(instance, token, image, buffer, contentType));
    }

    const status = truncate(variantText(context), TEXT_LIMIT);
    if (!status) return failed('Mastodon requires post text.', 'TEXT_REQUIRED');

    const body = new URLSearchParams({ status });
    mediaIds.forEach((id) => body.append('media_ids[]', id));

    const { data } = await requestJson<{ id?: string; url?: string }>(`${instance}/api/v1/statuses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!data.id) return failed('Mastodon did not confirm the post.');
    return {
      outcome: 'PUBLISHED',
      remotePostId: data.id,
      ...(data.url ? { publishedUrl: data.url } : {}),
      providerResponse: { id: data.id, url: data.url ?? null },
    };
  } catch (error) {
    if (isAuthError(error)) {
      const text = 'Mastodon rejected the access token. Add a new token for this instance.';
      await markReauthNeeded(account.id, text);
      return needsAuth(text);
    }
    if (error instanceof Error) return failed(error.message.slice(0, 400));
    return failed('The Mastodon request failed.');
  }
};
