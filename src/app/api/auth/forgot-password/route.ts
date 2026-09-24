import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/auth/validators';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { sendEmail } from '@/lib/emails';
import { siteConfig } from '@/config/site';
import { ok } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RESET_TOKEN_TTL_HOURS = 1;

export async function POST(request: Request) {
  const rl = await ratelimit(`forgot:${getClientId(request)}`, { limit: 5, windowSeconds: 900 });
  if (!rl.success) {
    return ok({});
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return ok({});
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  // Always respond the same way to avoid revealing whether an email is registered.
  if (!parsed.success) return ok({});

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  const response: { resetLink?: string } = {};
  if (user) {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);

    // Delete any existing reset tokens for this email before creating the new
    // one. This prevents multiple valid tokens from coexisting — the previous
    // upsert used the new random token in the where clause so it always
    // inserted rather than updating, leaving old tokens alive.
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({ data: { identifier: email, token, expires } });

    const resetLink = `${siteConfig.url}/reset-password?token=${token}`;

    const emailResult = await sendEmail({
      to: email,
      subject: 'Reset your SavDown password',
      text: `We received a request to reset your SavDown password.\n\nOpen this link to choose a new password (valid for 1 hour):\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: `<p>We received a request to reset your SavDown password.</p><p><a href="${resetLink}">Choose a new password</a> (valid for 1 hour).</p><p>If you didn't request this, you can safely ignore this email.</p>`,
    });

    // Only surface the link in the response body in local development when
    // no email transport is configured. Never do this in production — it
    // would leak a valid reset token over the wire to the browser.
    if (!emailResult.sent && process.env.NODE_ENV === 'development') {
      response.resetLink = resetLink;
    }
  }

  return ok(response);
}
