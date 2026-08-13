/**
 * Creates (or verifies) every SavDown product and price in Stripe.
 *
 *   npm run stripe:setup     — create anything missing, print the env lines
 *   npm run stripe:verify    — check the configured prices still match
 *
 * Idempotent: each price carries a `lookup_key` derived from the catalogue id,
 * so re-running finds the existing price instead of creating a duplicate.
 *
 * Reads STRIPE_SECRET_KEY from .env.local / .env. The key is never printed and
 * never leaves your machine — this talks to Stripe directly.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import Stripe from 'stripe';
import { PURCHASABLES, type Purchasable } from '../src/lib/billing';

const ROOT = resolve(__dirname, '..');

/** Minimal .env reader — the app relies on Next.js for this, scripts do not. */
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = resolve(ROOT, file);
    if (!existsSync(path)) continue;
    for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      // First file wins, matching Next.js precedence.
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function money(cents: number, currency: string) {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function lookupKey(item: Purchasable) {
  return `savdown_${item.id.replace(/-/g, '_')}`;
}

async function findExistingPrice(stripe: Stripe, item: Purchasable) {
  const key = lookupKey(item);
  const found = await stripe.prices.list({ lookup_keys: [key], limit: 1, active: true });
  return found.data[0];
}

/** Reuses a product with the same name so Pro monthly/yearly share one product. */
async function ensureProduct(stripe: Stripe, item: Purchasable, cache: Map<string, string>) {
  const cached = cache.get(item.productName);
  if (cached) return cached;

  const search = await stripe.products.search({
    query: `active:'true' AND name:'${item.productName.replace(/'/g, "\\'")}'`,
    limit: 1,
  });

  const product =
    search.data[0] ??
    (await stripe.products.create({
      name: item.productName,
      description: item.productDescription,
      metadata: { savdown: 'true' },
    }));

  cache.set(item.productName, product.id);
  return product.id;
}

async function main() {
  loadEnv();

  const verifyOnly = process.argv.includes('--verify');
  const secret = process.env.STRIPE_SECRET_KEY;

  if (!secret) {
    console.error('\n✖ STRIPE_SECRET_KEY is not set.');
    console.error('  Add it to .env.local (get it from the Stripe dashboard → Developers → API keys),');
    console.error('  then run this again. Use a test key (sk_test_…) until you have verified a purchase.\n');
    process.exit(1);
  }

  const live = secret.startsWith('sk_live');
  if (live && !process.argv.includes('--live')) {
    console.error('\n✖ That is a LIVE Stripe key, which would create real, chargeable products.');
    console.error('  Re-run with --live if that is genuinely what you want:');
    console.error('    npm run stripe:setup -- --live\n');
    process.exit(1);
  }

  const stripe = new Stripe(secret);
  const mode = live ? 'LIVE' : 'TEST';
  console.log(`\nSavDown → Stripe (${mode} mode)\n${'─'.repeat(58)}`);

  const productCache = new Map<string, string>();
  const envLines: string[] = [];
  let created = 0;
  let mismatches = 0;

  for (const item of PURCHASABLES) {
    const existing = await findExistingPrice(stripe, item);

    if (existing) {
      const amountOk = existing.unit_amount === item.amountCents;
      const intervalOk =
        item.kind === 'subscription'
          ? existing.recurring?.interval === item.interval
          : !existing.recurring;

      if (amountOk && intervalOk) {
        console.log(`✓ ${item.label.padEnd(30)} ${money(item.amountCents, item.currency).padEnd(12)} ${existing.id}`);
      } else {
        mismatches++;
        console.log(`✖ ${item.label.padEnd(30)} MISMATCH  ${existing.id}`);
        console.log(
          `    expected ${money(item.amountCents, item.currency)}` +
            (item.interval ? ` / ${item.interval}` : ' one-time') +
            `, Stripe has ${money(existing.unit_amount ?? 0, existing.currency)}` +
            (existing.recurring ? ` / ${existing.recurring.interval}` : ' one-time'),
        );
      }
      envLines.push(`${item.priceEnv}=${existing.id}`);
      continue;
    }

    if (verifyOnly) {
      mismatches++;
      console.log(`✖ ${item.label.padEnd(30)} MISSING — run npm run stripe:setup`);
      continue;
    }

    const productId = await ensureProduct(stripe, item, productCache);
    const price = await stripe.prices.create({
      product: productId,
      currency: item.currency,
      unit_amount: item.amountCents,
      lookup_key: lookupKey(item),
      ...(item.kind === 'subscription' && item.interval
        ? { recurring: { interval: item.interval } }
        : {}),
      metadata: { savdownItem: item.id, credits: String(item.credits) },
    });

    created++;
    console.log(`+ ${item.label.padEnd(30)} ${money(item.amountCents, item.currency).padEnd(12)} ${price.id}`);
    envLines.push(`${item.priceEnv}=${price.id}`);
  }

  console.log('─'.repeat(58));

  if (mismatches > 0) {
    console.log(
      `\n✖ ${mismatches} price(s) do not match src/lib/billing.ts.\n` +
        '  Fix them in the Stripe dashboard, or archive them there and re-run setup.\n' +
        '  Leaving them as-is means customers are charged an amount the pricing page does not show.\n',
    );
  }

  if (verifyOnly) {
    if (mismatches === 0) console.log('\n✓ Every price matches the pricing page.\n');
    process.exit(mismatches === 0 ? 0 : 1);
  }

  console.log(`\n${created} price(s) created, ${PURCHASABLES.length - created} already existed.`);
  console.log('\nAdd these to your .env.local:\n');
  console.log(envLines.join('\n'));
  console.log('\nThen set up the webhook:');
  console.log('  Local : stripe listen --forward-to localhost:3000/api/webhooks/stripe');
  console.log('  Live  : dashboard → Developers → Webhooks → add endpoint');
  console.log('          URL    https://<your-domain>/api/webhooks/stripe');
  console.log('          Events checkout.session.completed, invoice.paid,');
  console.log('                 customer.subscription.created / updated / deleted');
  console.log('  Copy the signing secret into STRIPE_WEBHOOK_SECRET.\n');
}

main().catch((error) => {
  console.error('\n✖ Stripe setup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
