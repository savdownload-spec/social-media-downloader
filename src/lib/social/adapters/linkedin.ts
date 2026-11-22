import { isAuthError, ProviderError, requestJson } from '../http';
import { freshAccessToken, markReauthNeeded, ReconnectRequiredError } from '../refresh';
import type { PlatformAdapter } from './index';
import { assetBytes, failed, imageAssets, needsAuth, truncate, variantText, videoAssets } from './util';

const API = 'https://api.linkedin.com/rest';
const VERSION = '202411';
const COMMENTARY_LIMIT = 3000;

function headers(token: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'LinkedIn-Version': VERSION,
    'X-Restli-Protocol-Version': '2.0.0',
    ...extra,
  };
}

function authorUrn(account: { externalAccountId: string; metadata: unknown }): string {
  const meta = (account.metadata as Record<string, unknown> | null) ?? {};
  if (typeof meta.personUrn === 'string') return meta.personUrn;
  return `urn:li:person:${account.externalAccountId}`;
}

async function uploadImage(token: string, owner: string, buffer: Buffer, contentType: string): Promise<string> {
  const initialized = await requestJson<{
    value?: { uploadUrl?: string; image?: string };
  }>(`${API}/images?action=initializeUpload`, {
    method: 'POST',
    headers: headers(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ initializeUploadRequest: { owner } }),
  });
  const uploadUrl = initialized.data.value?.uploadUrl;
  const imageUrn = initialized.data.value?.image;
  if (!uploadUrl || !imageUrn) throw new ProviderError('LinkedIn did not accept the image upload.');

  const upload = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
    body: new Uint8Array(buffer),
    signal: AbortSignal.timeout(45_000),
  });
  if (!upload.ok) throw new ProviderError(`LinkedIn image upload failed (HTTP ${upload.status}).`);
  return imageUrn;
}

export const linkedinAdapter: PlatformAdapter = async (context) => {
  const account = context.account;
  if (!account) return needsAuth('Connect your LinkedIn profile before publishing.');

  const images = imageAssets(context);
  if (images.length > 1) {
    return failed('LinkedIn accepts one image per post in this build.', 'MEDIA_COUNT');
  }
  if (videoAssets(context).length > 0) {
    return failed('LinkedIn video uploads are not enabled in this build.', 'MEDIA_TYPE');
  }

  let token: string;
  try {
    token = await freshAccessToken(account);
  } catch (error) {
    if (error instanceof ReconnectRequiredError) return needsAuth(error.message);
    throw error;
  }

  try {
    const owner = authorUrn(account);
    let mediaUrn: string | null = null;
    if (images.length === 1) {
      const { buffer, contentType } = await assetBytes(images[0]);
      mediaUrn = await uploadImage(token, owner, buffer, contentType || images[0].mimeType);
    }

    const body: Record<string, unknown> = {
      author: owner,
      commentary: truncate(variantText(context), COMMENTARY_LIMIT),
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
    if (mediaUrn) {
      body.content = {
        media: {
          id: mediaUrn,
          ...(images[0]?.altText ? { altText: images[0].altText.slice(0, 400) } : {}),
        },
      };
    }

    const { headers: responseHeaders } = await requestJson<unknown>(`${API}/posts`, {
      method: 'POST',
      headers: headers(token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    const postUrn = responseHeaders.get('x-restli-id');
    if (!postUrn) return failed('LinkedIn did not return the post id; no success was recorded.');

    return {
      outcome: 'PUBLISHED',
      remotePostId: postUrn,
      publishedUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(postUrn)}/`,
      providerResponse: { urn: postUrn },
    };
  } catch (error) {
    if (isAuthError(error)) {
      const text = 'LinkedIn rejected the token. Reconnect the account.';
      await markReauthNeeded(account.id, text);
      return needsAuth(text);
    }
    if (error instanceof Error) return failed(error.message.slice(0, 400));
    return failed('The LinkedIn request failed.');
  }
};
