import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { sha256 } from '@/lib/utils';
import { sendContactNotification } from '@/lib/emails';
import { createAdminNotification } from '@/lib/admin-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  name: z.string().max(120).optional().default(''),
  email: z.string().email().max(254),
  subject: z.string().max(200).optional().default(''),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  // Honeypot — must be empty
  website: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  // ── Same-origin / CSRF check ─────────────────────────────────────────────
  const origin = req.headers.get('origin');
  const site = process.env.NEXT_PUBLIC_SITE_URL || '';
  const secFetch = req.headers.get('sec-fetch-site');
  if (secFetch === 'cross-site') {
    return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
  }
  if (origin && site && !origin.startsWith(site)) {
    return NextResponse.json({ ok: false, error: 'Forbidden.' }, { status: 403 });
  }

  // ── Content-type check ───────────────────────────────────────────────────
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return NextResponse.json({ ok: false, error: 'Unsupported media type.' }, { status: 415 });
  }

  // ── Rate limit: 3 req / 60 s ─────────────────────────────────────────────
  const rl = await ratelimit(`ct:${getClientId(req)}`, { limit: 3, windowSeconds: 60 });
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Too many requests. Please slow down.' }, { status: 429 });
  }

  // ── Body size limit: 8 KB ────────────────────────────────────────────────
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > 8192) {
    return NextResponse.json({ ok: false, error: 'Request too large.' }, { status: 413 });
  }

  let json: unknown;
  try {
    const text = await req.text();
    if (text.length > 8192) {
      return NextResponse.json({ ok: false, error: 'Request too large.' }, { status: 413 });
    }
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  // ── Zod validation ───────────────────────────────────────────────────────
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? 'Invalid input.';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const { name, email, subject, message, website } = parsed.data;

  // ── Honeypot ─────────────────────────────────────────────────────────────
  if (website && website.length > 0) {
    // Silent success — bots never get an error
    return NextResponse.json({ ok: true });
  }

  // ── Idempotency ──────────────────────────────────────────────────────────
  const idempotencyKey = await sha256(`${getClientId(req)}:${email}:${message.slice(0, 100)}`);

  try {
    // Check for existing record with this key
    const existing = await prisma.contactMessage.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return NextResponse.json({ ok: true });
    }

    // ── Save to DB ───────────────────────────────────────────────────────
    const record = await prisma.contactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
        status: 'NEW',
        emailNotificationSent: false,
        emailDeliveryFailed: false,
        idempotencyKey,
      },
    });

    // ── Admin notification ───────────────────────────────────────────────
    await createAdminNotification(prisma, {
      type: 'CONTACT_MESSAGE',
      section: 'contacts',
      entityType: 'ContactMessage',
      entityId: record.id,
      title: 'New contact enquiry',
      message: `From ${name || email}${subject ? `: ${subject}` : ''}`,
      href: `/admin/contacts?id=${record.id}`,
      dedupeKey: `contact:new:${record.id}`,
    }).catch(() => {/* notification failure must not block the response */});

    // ── Fire-and-forget emails ───────────────────────────────────────────
    sendContactNotification({
      name,
      email,
      subject,
      message,
      createdAt: record.createdAt,
    }).then(async (result) => {
      const sent = result.notificationSent;
      const failed = !sent;
      try {
        await prisma.contactMessage.update({
          where: { id: record.id },
          data: { emailNotificationSent: sent, emailDeliveryFailed: failed },
        });
        if (failed) {
          await createAdminNotification(prisma, {
            type: 'contact_email_failed',
            section: 'contacts',
            entityType: 'ContactMessage',
            entityId: record.id,
            title: 'Email delivery failed',
            message: 'Contact enquiry saved but notification email failed to send.',
            href: `/admin/contacts?id=${record.id}`,
            dedupeKey: `contact-email-failed-${record.id}`,
          });
        }
      } catch {
        // Background update — ignore failures
      }
    }).catch(() => {/* fully suppress background errors */});

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Handle Prisma unique constraint on idempotencyKey (P2002) as dedup
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json({ ok: true });
    }
    console.error('[contact] DB error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: 'Failed to save your message. Please try again.' }, { status: 500 });
  }
}
