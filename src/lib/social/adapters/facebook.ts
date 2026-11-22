import { isAuthError, requestJson } from '../http';
import { freshAccessToken, markReauthNeeded, ReconnectRequiredError } from '../refresh';
import { metaGraphBase } from '../oauth/providers/meta';
import type { PlatformAdapter } from './index';
import { failed, imageAssets, needsAuth, publicMediaUrl, variantText, videoAssets } from './util';

function pageIdOf(account: { externalAccountId: string; metadata: unknown }): string {
  const meta = (account.metadata as Record<string, unknown> | null) ?? {};
  return typeof meta.pageId === 'string' ? meta.pageId : account.externalAccountId;
}

export const facebookAdapter: PlatformAdapter = async (context) => {
  const account = context.account;
  if (!account) return needsAuth('Connect a Facebook Page before publishing.');

  let token: string;
  try {
    token = await freshAccessToken(account);
  } catch (error) {
    if (error instanceof ReconnectRequiredError) return needsAuth(error.message);
    throw error;
  }

  const graph = metaGraphBase();
  const pageId = pageIdOf(account);
  const message = variantText(context);
  if (videoAssets(context).length > 0) {
    return failed('Facebook video uploads are not enabled in this build.', 'MEDIA_TYPE');
  }
  const images = imageAssets(context);

  if (images.length > 0) {
    const urls = images.map(publicMediaUrl);
    if (urls.some((url) => !url)) {
      return failed('Facebook needs publicly reachable media. Use Vercel Blob storage for these images.', 'MEDIA_NOT_PUBLIC');
    }
  }

  try {
    if (images.length === 0) {
      const { data } = await requestJson<{ id?: string }>(`${graph}/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          message,
          access_token: token,
          ...(context.post.linkUrl ? { link: context.post.linkUrl } : {}),
        }).toString(),
      });
      if (!data.id) return failed('Facebook did not confirm the post.');
      return { outcome: 'PUBLISHED', remotePostId: data.id, publishedUrl: `https://www.facebook.com/${data.id}`, providerResponse: data };
    }

    if (images.length === 1) {
      const { data } = await requestJson<{ id?: string; post_id?: string }>(`${graph}/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          url: publicMediaUrl(images[0])!,
          message,
          access_token: token,
        }).toString(),
      });
      const postId = data.post_id ?? data.id;
      if (!postId) return failed('Facebook did not confirm the photo post.');
      return { outcome: 'PUBLISHED', remotePostId: postId, publishedUrl: `https://www.facebook.com/${postId}`, providerResponse: data };
    }

    // Multiple photos: upload unpublished photos, then attach them to one feed post.
    const mediaIds: string[] = [];
    for (const image of images) {
      const { data } = await requestJson<{ id?: string }>(`${graph}/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          url: publicMediaUrl(image)!,
          published: 'false',
          access_token: token,
        }).toString(),
      });
      if (!data.id) return failed('Facebook did not accept one of the photos.');
      mediaIds.push(data.id);
    }

    const body = new URLSearchParams({ message, access_token: token });
    mediaIds.forEach((id, index) => body.set(`attached_media[${index}]`, JSON.stringify({ media_fbid: id })));
    const { data } = await requestJson<{ id?: string }>(`${graph}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!data.id) return failed('Facebook did not confirm the multi-photo post.');
    return { outcome: 'PUBLISHED', remotePostId: data.id, publishedUrl: `https://www.facebook.com/${data.id}`, providerResponse: data };
  } catch (error) {
    if (isAuthError(error)) {
      const messageText = 'Facebook rejected the Page token. Reconnect the Page.';
      await markReauthNeeded(account.id, messageText);
      return needsAuth(messageText);
    }
    if (error instanceof Error) return failed(error.message.slice(0, 400));
    return failed('The Facebook request failed.');
  }
};
