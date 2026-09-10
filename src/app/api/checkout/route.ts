import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { ratelimit } from '@/lib/ratelimit';
import { findPurchasable, resolveSafepayPurchase } from '@/lib/billing';
import { getSafepayClient, getSafepayConfig, checkoutUrl } from '@/lib/safepay';
import { siteConfig } from '@/config/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Creates a Safepay Hosted Checkout URL for one server-side catalogue item. */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in to continue.', 401);

  const limit = await ratelimit(`checkout:${userId}`, { limit: 10, windowSeconds: 60 });
  if (!limit.success) return fail('Too many attempts. Please try again shortly.', 429);

  const config = getSafepayConfig();
  const safepay = getSafepayClient();
  if (!config || !safepay) return fail('Payments are not available right now.', 503);

  let body: unknown;
  try { body = await request.json(); } catch { return fail('Invalid request body.'); }
  const itemId = (body as { item?: unknown })?.item;
  if (typeof itemId !== 'string') return fail('Choose a plan to continue.');

  const item = findPurchasable(itemId);
  if (!item) return fail('That plan is not available.', 404);
  let purchase: { amount: number; currency: 'USD' };
  try { purchase = await resolveSafepayPurchase(item); } catch { return fail('That plan is not configured for purchase yet.', 503); }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, plan: true },
  });
  if (!user) return fail('Account not found.', 404);
  if (item.kind === 'subscription' && user.plan === 'LIFETIME') {
    return fail('You already have lifetime access, so there is nothing to subscribe to.', 409);
  }

  try {
    const origin = resolveOrigin(request);
    const metadata = { userId: user.id, itemId: item.id, provider: 'SAFEPAY' };
    const trackerResponse = await safepay.payments.session.setup({
      merchant_api_key: config.merchantApiKey,
      intent: config.intent,
      mode: item.kind === 'subscription' ? 'subscription' : 'payment',
      entry_mode: config.entryMode,
      currency: purchase.currency,
      amount: purchase.amount,
      metadata,
      include_fees: false,
    });
    const tracker = trackerResponse?.data?.tracker;
    if (!tracker?.token) return fail('Could not start checkout. Please try again.', 502);

    const passportResponse = await safepay.client.passport.create();
    const passport = passportResponse?.data;
    if (typeof passport !== 'string' || !passport) return fail('Could not start checkout. Please try again.', 502);

    const url = checkoutUrl({
      tracker: tracker.token,
      passport,
      mode: config.mode,
      redirectUrl: `${origin}/account/billing?checkout=success&provider=safepay&tracker=${encodeURIComponent(tracker.token)}`,
      cancelUrl: `${origin}/pricing?checkout=cancelled`,
    });

    await prisma.payment.upsert({
      where: { provider_providerPaymentId: { provider: 'SAFEPAY', providerPaymentId: tracker.token } },
      create: { provider: 'SAFEPAY', providerPaymentId: tracker.token, userId: user.id, itemId: item.id, amount: purchase.amount, currency: purchase.currency, status: 'pending', metadata },
      update: { userId: user.id, itemId: item.id, amount: purchase.amount, currency: purchase.currency, status: 'pending', metadata },
    });
    return ok({ url });
  } catch (error) {
    console.error('Safepay checkout session failed:', error);
    return fail('Could not start checkout. Please try again.', 502);
  }
}

function resolveOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  return (configured || new URL(request.url).origin).replace(/\/$/, '');
}
