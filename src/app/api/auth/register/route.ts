import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/passwords';
import { registerSchema } from '@/lib/auth/validators';
import { ratelimit, getClientId } from '@/lib/ratelimit';
import { ok, fail } from '@/lib/api';
import { attributeReferralSignupInTransaction, REFERRAL_COOKIE } from '@/lib/affiliates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rl = await ratelimit(`register:${getClientId(request)}`, {
    limit: 10, windowSeconds: 900, failClosed: process.env.NODE_ENV === 'production',
  });
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
  const refCode = cookies().get(REFERRAL_COOKIE)?.value;
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, password: passwordHash },
        select: { id: true, name: true, email: true },
      });
      await attributeReferralSignupInTransaction(tx, created.id, refCode, true);
      return created;
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return fail('An account with this email already exists.', 409);
    }
    throw error;
  }

  return NextResponse.json({ ok: true, user }, { status: 201 });
}
