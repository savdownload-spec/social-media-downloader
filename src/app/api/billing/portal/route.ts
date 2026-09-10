import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ok, fail } from '@/lib/api';
import { ratelimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Safepay does not expose a universal customer portal URL. Deployments may set
 * SAFEPAY_MANAGEMENT_URL to their approved account-management destination;
 * otherwise the UI keeps the local billing source of truth and reports clearly
 * that no management URL has been configured. This route intentionally does not
 * initialize or call Stripe.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in to continue.', 401);
  const limit = await ratelimit(`portal:${userId}`, { limit: 10, windowSeconds: 60 });
  if (!limit.success) return fail('Too many attempts. Please try again shortly.', 429);

  const managementUrl = process.env.SAFEPAY_MANAGEMENT_URL?.trim();
  if (!managementUrl) return fail('Safepay subscription management is not configured for this account yet.', 503);
  return ok({ url: managementUrl });
}
