import crypto from 'node:crypto';
import Safepay from '@sfpy/node-core';

export type SafepayMode = 'sandbox' | 'production';

export function getSafepayConfig() {
  const mode = (process.env.SAFEPAY_MODE ?? 'sandbox') as SafepayMode;
  const secretKey = process.env.SAFEPAY_SECRET_KEY?.trim();
  // Safepay documents this as the public merchant API key. Keep the older
  // internal variable as a compatibility alias, but prefer the public name.
  const merchantApiKey = (process.env.SAFEPAY_PUBLIC_KEY ?? process.env.SAFEPAY_MERCHANT_API_KEY)?.trim();
  if (!secretKey || !merchantApiKey) return null;
  return {
    mode,
    secretKey,
    merchantApiKey,
    host: mode === 'production' ? 'https://api.getsafepay.com' : 'https://sandbox.api.getsafepay.com',
    // SavDown pricing is authored in USD. Safepay converts the quote to its
    // PKR base/settlement currency; do not invent a local FX rate.
    quoteCurrency: 'USD',
    settlementCurrency: (process.env.SAFEPAY_CURRENCY ?? 'PKR').toUpperCase(),
    intent: process.env.SAFEPAY_INTENT ?? 'CYBERSOURCE',
    entryMode: process.env.SAFEPAY_ENTRY_MODE ?? 'raw',
  } as const;
}

export function getSafepayClient() {
  const config = getSafepayConfig();
  if (!config) return null;
  return new Safepay(config.secretKey, { authType: 'secret', host: config.host });
}

export function verifySafepayWebhook(args: {
  body: Uint8Array;
  signature: string | null;
  timestamp: string | null;
  secret?: string;
  toleranceSeconds?: number;
}): boolean {
  const secret = args.secret ?? process.env.SAFEPAY_WEBHOOK_SECRET;
  if (!secret || !args.signature || !args.timestamp) return false;
  const timestampDate = Date.parse(args.timestamp);
  const tolerance = args.toleranceSeconds ?? 300;
  if (!Number.isFinite(timestampDate) || Math.abs(Date.now() - timestampDate) > tolerance * 1000) return false;

  let key: Buffer;
  try {
    key = Buffer.from(secret, 'base64');
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const payload = Buffer.concat([Buffer.from(`${args.timestamp}.`), Buffer.from(args.body)]);
  const digest = crypto.createHmac('sha256', key).update(payload).digest('hex');
  const expected = Buffer.from(`sha256=${digest}`);
  const provided = Buffer.from(args.signature);
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

export function checkoutUrl(args: {
  tracker: string;
  passport: string;
  mode: SafepayMode;
  redirectUrl: string;
  cancelUrl: string;
}) {
  const url = new URL(args.mode === 'production'
    ? 'https://getsafepay.com/checkout'
    : 'https://sandbox.getsafepay.com/checkout');
  url.searchParams.set('tracker', args.tracker);
  url.searchParams.set('tbt', args.passport);
  url.searchParams.set('environment', args.mode);
  url.searchParams.set('source', 'hosted');
  url.searchParams.set('redirect_url', args.redirectUrl);
  url.searchParams.set('cancel_url', args.cancelUrl);
  return url.toString();
}

export function safeJson(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

export function safepayEventId(headers: Headers, payload: Record<string, unknown>): string {
  return headers.get('x-sfpy-event-id') ?? headers.get('x-sfpy-delivery-id') ?? String(payload.id ?? payload.event_id ?? crypto.randomUUID());
}

export function safepayEventType(headers: Headers, payload: Record<string, unknown>): string {
  return headers.get('x-sfpy-event-type') ?? String(payload.type ?? payload.event_type ?? 'unknown');
}
