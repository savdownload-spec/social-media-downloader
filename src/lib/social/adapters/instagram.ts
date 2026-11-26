import { isAuthError, requestJson } from '../http';
import { freshAccessToken, markReauthNeeded, ReconnectRequiredError } from '../refresh';
import { metaGraphBase } from '../oauth/providers/meta';
import type { PlatformAdapter } from './index';
import { failed, needsAuth, publicMediaUrl, truncate, variantText } from './util';

const CAPTION_LIMIT = 2200;
const POLL_ATTEMPTS = 8;
const POLL_DELAY_MS = 4_000;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function igUserId(account: { externalAccountId: string; metadata: unknown }): string {
  const meta = (account.metadata as Record<string, unknown> | null) ?? {};
  return typeof meta.igUserId === 'string' ? meta.igUserId : account.externalAccountId;
}

export const instagramAdapter: PlatformAdapter = async (context) => {
  const account = context.account;
  if (!account) return needsAuth('Connect an Instagram professional account before publishing.');

  if (context.assets.length === 0) {
    return failed('Instagram requires an image or video for every post.', 'MEDIA_REQUIRED');
  }
  if (context.assets.length > 1) {
    return failed('Instagram publishing supports one image or one video per post in this build.', 'MEDIA_COUNT');
  }

  const asset = context.assets[0];
  const mediaUrl = publicMediaUrl(asset);
  if (!mediaUrl) {
    return failed('Instagram fetches media from a public URL. Publish with Vercel Blob storage enabled.', 'MEDIA_NOT_PUBLIC');
  }
  if (asset.kind === 'IMAGE' && asset.mimeType !== 'image/jpeg') {
    return failed('Instagram only accepts JPEG images. Replace this image with a JPEG.', 'MEDIA_TYPE');
  }

  let token: string;
  try {
    token = await freshAccessToken(account);
  } catch (error) {
    if (error instanceof ReconnectRequiredError) return needsAuth(error.message);
    throw error;
  }

  const graph = metaGraphBase();
  const igId = igUserId(account);
  const caption = truncate(variantText(context), CAPTION_LIMIT);

  try {
    const containerBody = new URLSearchParams({ caption, access_token: token });
    if (asset.kind === 'VIDEO') {
      containerBody.set('media_type', 'REELS');
      containerBody.set('video_url', mediaUrl);
    } else {
      containerBody.set('image_url', mediaUrl);
    }

    const container = await requestJson<{ id?: string }>(`${graph}/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerBody.toString(),
    });
    if (!container.data.id) return failed('Instagram did not create the media container.');
    const creationId = container.data.id;

    // Instagram processes media asynchronously; publish only after FINISHED.
    let finished = false;
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_DELAY_MS);
      const status = await requestJson<{ status_code?: string }>(
        `${graph}/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`,
      );
      const code = status.data.status_code;
      if (code === 'FINISHED') {
        finished = true;
        break;
      }
      if (code === 'ERROR' || code === 'EXPIRED') {
        return failed('Instagram could not process this media. Check format and dimensions.', 'MEDIA_PROCESSING');
      }
    }
    if (!finished) {
      return failed('Instagram is still processing this media. Publish again once it finishes.', 'MEDIA_PROCESSING_TIMEOUT');
    }

    const published = await requestJson<{ id?: string }>(`${graph}/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: creationId, access_token: token }).toString(),
    });
    if (!published.data.id) return failed('Instagram did not confirm the publish.');
    const mediaId = published.data.id;

    let permalink: string | undefined;
    try {
      const info = await requestJson<{ permalink?: string }>(
        `${graph}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`,
      );
      permalink = info.data.permalink;
    } catch {
      // permalink lookup is cosmetic; the post id is already confirmed
    }

    return {
      outcome: 'PUBLISHED',
      remotePostId: mediaId,
      ...(permalink ? { publishedUrl: permalink } : {}),
      providerResponse: { mediaId, permalink: permalink ?? null },
    };
  } catch (error) {
    if (isAuthError(error)) {
      const text = 'Instagram rejected the connection token. Reconnect the account.';
      await markReauthNeeded(account.id, text);
      return needsAuth(text);
    }
    if (error instanceof Error) return failed(error.message.slice(0, 400));
    return failed('The Instagram request failed.');
  }
};
