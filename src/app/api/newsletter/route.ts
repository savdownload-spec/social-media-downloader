import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { subscribeNewsletter } from '@/lib/newsletter/service';
import { NewsletterError } from '@/lib/newsletter/provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const Body = z.object({
  email: z.string().trim().max(254).email().transform((email) => email.toLowerCase()),
  website: z.string().max(200).optional(),
});
const failure = "We couldn't complete your subscription right now. Please try again in a moment.";
const reply = (body: object, status = 200, headers = {}) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    if ((origin && origin !== new URL(req.url).origin) || req.headers.get('sec-fetch-site') === 'cross-site') {
      return reply({ ok: false, error: failure }, 403);
    }
    if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return reply({ ok: false, error: 'Please submit a valid email address.' }, 415);
    }
    const rl = await ratelimit(`nl:${getClientId(req)}`, { limit: 5, windowSeconds: 60, failClosed: true });
    if (rl.unavailable) throw new NewsletterError('rate_limit_unavailable');
    if (!rl.success) return reply({ ok: false, error: 'Please wait a moment before trying again.' }, 429, { 'Retry-After': String(rl.resetSeconds) });
    // Bound actual bytes, including chunked requests without Content-Length.
    const reader = req.body?.getReader();
    if (!reader) return reply({ ok: false, error: 'Please enter a valid email address.' }, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); return reply({ ok: false, error: 'Request is too large.' }, 413); }
      chunks.push(value);
    }
    let json: unknown;
    try { json = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return reply({ ok: false, error: 'Please enter a valid email address.' }, 400); }
    const parsed = Body.safeParse(json);
    if (!parsed.success) return reply({ ok: false, error: 'Please enter a valid email address.' }, 400);
    if (parsed.data.website) return reply({ ok: true });
    const emailKey = createHash('sha256').update(parsed.data.email).digest('hex');
    const emailLimit = await ratelimit(`nl-email:${emailKey}`, { limit: 3, windowSeconds: 3600, failClosed: true });
    if (emailLimit.unavailable) throw new NewsletterError('rate_limit_unavailable');
    if (!emailLimit.success) return reply({ ok: false, error: 'Please wait before trying again.' }, 429, { 'Retry-After': String(emailLimit.resetSeconds) });
    await subscribeNewsletter(parsed.data.email);
    // Identical response for new, existing and suppressed addresses.
    return reply({ ok: true });
  } catch (error) {
    console.error('[newsletter]', error instanceof NewsletterError ? error.code : 'storage_or_internal_failure');
    return reply({ ok: false, error: failure }, 503, { 'Retry-After': '60' });
  }
}
