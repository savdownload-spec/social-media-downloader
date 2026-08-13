import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { getStripe } from '@/lib/stripe';
import { findPurchasable, priceIdFor } from '@/lib/billing';
import { siteConfig } from '@/config/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Creates a Stripe Checkout Session for one catalogue item and returns its URL.
 *
 * The client sends only an item id — never a price or an amount — so a tampered
 * request can at worst buy a different listed product at its real price.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in to continue.', 401);

  const limit = await ratelimit(`checkout:${userId}`, { limit: 10, windowSeconds: 60 });
  if (!limit.success) return fail('Too many attempts. Please try again shortly.', 429);

  const stripe = getStripe();
  if (!stripe) return fail('Payments are not available right now.', 503);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body.');
  }

  const itemId = (body as { item?: unknown })?.item;
  if (typeof itemId !== 'string') return fail('Choose a plan to continue.');

  const item = findPurchasable(itemId);
  if (!item) return fail('That plan is not available.', 404);

  const priceId = priceIdFor(item);
  if (!priceId) return fail('That plan is not available for purchase yet.', 503);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, stripeCustomerId: true, plan: true },
  });
  if (!user) return fail('Account not found.', 404);

  if (item.kind === 'subscription' && user.plan === 'LIFETIME') {
    return fail('You already have lifetime access, so there is nothing to subscribe to.', 409);
  }

  try {
    const customerId = await ensureCustomer(stripe, user);
    const origin = resolveOrigin(request);

    const checkout = await stripe.checkout.sessions.create({
      mode: item.kind === 'subscription' ? 'subscription' : 'payment',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      // The webhook is the only thing that grants credits, and it reads these.
      client_reference_id: user.id,
      metadata: { userId: user.id, itemId: item.id },
      ...(item.kind === 'subscription'
        ? { subscription_data: { metadata: { userId: user.id, itemId: item.id } } }
        : { payment_intent_data: { metadata: { userId: user.id, itemId: item.id } } }),
      success_url: `${origin}/account/billing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    });

    if (!checkout.url) return fail('Could not start checkout. Please try again.', 502);
    return ok({ url: checkout.url });
  } catch (error) {
    console.error('Checkout session failed:', error);
    return fail('Could not start checkout. Please try again.', 502);
  }
}

/** Reuses the saved Stripe customer, creating (and persisting) one on first purchase. */
async function ensureCustomer(
  stripe: NonNullable<ReturnType<typeof getStripe>>,
  user: { id: string; email: string | null; stripeCustomerId: string | null },
): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Builds the return URLs from configured site URL, falling back to the request
 * origin in development. Never trusts a client-supplied redirect target.
 */
function resolveOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  if (configured) return configured.replace(/\/$/, '');
  return new URL(request.url).origin;
}
