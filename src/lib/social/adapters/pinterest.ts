import { isAuthError, requestJson } from '../http';
import { freshAccessToken, markReauthNeeded, ReconnectRequiredError } from '../refresh';
import { pinterestApiBase } from '../oauth/providers/pinterest';
import type { PlatformAdapter } from './index';
import { failed, imageAssets, needsAuth, optionValue, publicMediaUrl, truncate, variantText, variantTitle, videoAssets } from './util';

type Board = { id: string; name: string };

function boardsOf(account: { metadata: unknown }): Board[] {
  const meta = (account.metadata as Record<string, unknown> | null) ?? {};
  const boards = meta.boards;
  if (!Array.isArray(boards)) return [];
  return boards
    .filter((board): board is Board => Boolean(board) && typeof board === 'object')
    .map((board) => ({ id: String((board as Board).id), name: String((board as Board).name ?? '') }));
}

export const pinterestAdapter: PlatformAdapter = async (context) => {
  const account = context.account;
  if (!account) return needsAuth('Connect a Pinterest account before publishing.');

  const images = imageAssets(context);
  if (videoAssets(context).length > 0) {
    return failed('Pinterest video Pins need a separate upload flow and are not enabled yet.', 'MEDIA_TYPE');
  }
  if (images.length === 0) return failed('Pinterest requires an image.', 'MEDIA_REQUIRED');
  if (images.length > 1) return failed('Pinterest accepts one image per Pin in this build.', 'MEDIA_COUNT');

  const imageUrl = publicMediaUrl(images[0]);
  if (!imageUrl) {
    return failed('Pinterest fetches the image from a public URL. Use Vercel Blob storage for this Pin.', 'MEDIA_NOT_PUBLIC');
  }

  const boards = boardsOf(account);
  const requested = optionValue(context, 'board');
  let boardId: string | null = null;
  if (requested) {
    boardId =
      boards.find((board) => board.id === requested)?.id ??
      boards.find((board) => board.name.toLowerCase() === requested.toLowerCase())?.id ??
      requested;
  } else if (boards.length === 1) {
    boardId = boards[0].id;
  }
  if (!boardId) {
    return failed('Choose a Pinterest board for this post. Reconnect if no boards are listed.', 'BOARD_REQUIRED');
  }

  let token: string;
  try {
    token = await freshAccessToken(account);
  } catch (error) {
    if (error instanceof ReconnectRequiredError) return needsAuth(error.message);
    throw error;
  }

  try {
    const title = truncate(variantTitle(context), 100);
    const description = truncate(variantText(context), 800);
    const { data } = await requestJson<{ id?: string }>(`${pinterestApiBase()}/pins`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board_id: boardId,
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        media_source: { source_type: 'image_url', url: imageUrl },
      }),
    });
    if (!data.id) return failed('Pinterest did not confirm the Pin.');
    return {
      outcome: 'PUBLISHED',
      remotePostId: data.id,
      publishedUrl: `https://www.pinterest.com/pin/${data.id}/`,
      providerResponse: { id: data.id, boardId },
    };
  } catch (error) {
    if (isAuthError(error)) {
      const text = 'Pinterest rejected the token. Reconnect the account.';
      await markReauthNeeded(account.id, text);
      return needsAuth(text);
    }
    if (error instanceof Error) return failed(error.message.slice(0, 400));
    return failed('The Pinterest request failed.');
  }
};
