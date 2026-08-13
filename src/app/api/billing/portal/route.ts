import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ok, fail } from '@/lib/api';
import { ratelimit } from '@/lib/ratelimit';
import { getStripe } from '@/lib/stripe';
import { siteConfig } from '@/config/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Opens the Stripe billing portal, where a customer can update their card,
 * download invoices and cancel. Cancellation lives there rather than in a
 * bespoke endpoint so the "cancel anytime" promise is backed by Stripe itself.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return fail('Please log in to continue.', 401);

  const limit = await ratelimit(`portal:${userId}`, { limit: 10, windowSeconds: 60 });
  if (!limit.success) return fail('Too many attempts. Please try again shortly.', 429);

  const stripe = getStripe();
  if (!stripe) return fail('Billing is not available right now.', 503);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return fail('You do not have any billing history yet.', 404);
  }

  const origin = (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url || '').replace(/\/$/, '');

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/account/billing`,
    });
    return ok({ url: portal.url });
  } catch (error) {
    console.error('Billing portal session failed:', error);
    return fail('Could not open the billing portal. Please try again.', 502);
  }
}
