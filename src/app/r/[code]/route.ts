import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { REFERRAL_COOKIE, REFERRAL_COOKIE_MAX_AGE } from '@/lib/affiliates-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { code: string } }) {
  const code = params.code;
  const validCode = /^[a-z0-9-]{1,40}$/i.test(code);

  if (validCode) {
    // Count server-validated link opens separately from registered users.
    // Repeated opens are counted as visits; this is not a unique-user metric.
    await prisma.affiliate.updateMany({
      where: { code, status: 'ACTIVE' },
      data: { totalClicks: { increment: 1 } },
    }).catch(() => undefined);
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('google', '1');
  loginUrl.searchParams.set('callbackUrl', '/workspace');
  const response = NextResponse.redirect(loginUrl);

  // First-touch attribution: later affiliate links cannot replace the saved code.
  if (validCode && !request.cookies.has(REFERRAL_COOKIE)) {
    response.cookies.set(REFERRAL_COOKIE, code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: REFERRAL_COOKIE_MAX_AGE,
      sameSite: 'lax',
      path: '/',
    });
  }

  return response;
}
