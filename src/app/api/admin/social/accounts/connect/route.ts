import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSocialApi, socialError, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';
import { connectBluesky, connectMastodon } from '@/lib/social/connect';
import { ProviderError } from '@/lib/social/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const blueskySchema = z.object({
  platform: z.literal('BLUESKY'),
  handle: z.string().trim().min(1, 'Enter your Bluesky handle.'),
  appPassword: z.string().trim().min(8, 'Enter the App Password from Bluesky settings.'),
  pds: z.string().trim().max(200).optional().nullable(),
});

const mastodonSchema = z.object({
  platform: z.literal('MASTODON'),
  instance: z.string().trim().min(1, 'Enter your instance URL.'),
  accessToken: z.string().trim().min(8, 'Enter the access token from your instance.'),
});

const bodySchema = z.discriminatedUnion('platform', [blueskySchema, mastodonSchema]);

export async function POST(request: NextRequest) {
  const auth = await requireSocialApi(request, 'accounts');
  if (!auth.ok) return auth.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return socialError(parsed.error.issues[0]?.message ?? 'Invalid connection details.', 400);
  }

  try {
    const account =
      parsed.data.platform === 'BLUESKY'
        ? await connectBluesky(auth.actor, parsed.data)
        : await connectMastodon(auth.actor, parsed.data);

    return NextResponse.json(
      {
        ok: true,
        data: {
          account: {
            id: account.id,
            platform: account.platform,
            accountName: account.accountName,
            username: account.username,
            status: account.status,
          },
        },
      },
      { headers: SOCIAL_NO_STORE_HEADERS },
    );
  } catch (error) {
    if (error instanceof ProviderError) return socialError(error.message, 400);
    return socialError('The account could not be connected. Check the details and try again.', 400);
  }
}
