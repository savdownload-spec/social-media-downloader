import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/passwords';
import { registerSchema } from '@/lib/auth/validators';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { ok, fail } from '@/lib/api';
import { creditReferralSignup, REFERRAL_COOKIE } from '@/lib/affiliates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rl = await ratelimit(`register:${getClientId(request)}`, { limit: 10, windowSeconds: 900 });
  if (!rl.success) {
    return fail('Too many attempts. Please try again later.', 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('Invalid request body.');
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'Invalid input.');
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return fail('An account with this email already exists.', 409);

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, password: passwordHash },
    select: { id: true, name: true, email: true },
  });

  const refCode = cookies().get(REFERRAL_COOKIE)?.value;
  await creditReferralSignup(refCode);

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
