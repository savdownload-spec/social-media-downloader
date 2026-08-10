import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/passwords';
import { resetPasswordSchema } from '@/lib/auth/validators';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { ok, fail } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rl = await ratelimit(`reset:${getClientId(request)}`, { limit: 10, windowSeconds: 900 });
  if (!rl.success) {
    return fail('Too many attempts. Please try again later.', 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body.');
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const { token, password } = parsed.data;
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.expires < new Date()) {
    return fail('This reset link is invalid or has expired. Please request a new one.', 400);
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { email: record.identifier },
    data: { password: passwordHash },
  });

  await prisma.verificationToken.delete({ where: { token } });

  return ok({ message: 'Password updated. You can now sign in with your new password.' });
}
