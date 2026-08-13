import Stripe from 'stripe';

/**
 * Lazily-constructed Stripe client.
 *
 * Deliberately not created at module load: the pricing page and the rest of the
 * site must keep building and rendering on a machine that has no Stripe keys,
 * so anything that needs Stripe asks for it and handles `null`.
 */
let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    // No explicit `apiVersion`: the SDK pins the version its types were
    // generated from, so letting it choose keeps the payload shapes the
    // webhook handler expects in step with the types it compiles against.
    client = new Stripe(key, {
      appInfo: { name: 'SavDown', url: 'https://savdown.com' },
    });
  }
  return client;
}

/** True when checkout is fully configured and safe to offer to users. */
export function isBillingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
