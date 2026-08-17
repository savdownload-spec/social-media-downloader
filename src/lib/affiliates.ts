import { prisma } from './prisma';

export { REFERRAL_COOKIE } from './affiliates-constants';

/**
 * Credits a signup to the affiliate whose code is in the referral cookie.
 * Best-effort: only active affiliates are credited, and any failure is
 * swallowed so a broken/unknown code never blocks account creation.
 */
export async function creditReferralSignup(refCode: string | undefined | null): Promise<void> {
  if (!refCode) return;
  try {
    await prisma.affiliate.updateMany({
      where: { code: refCode, status: 'ACTIVE' },
      data: { totalSignups: { increment: 1 } },
    });
  } catch {
    // Non-critical — never block signup over referral bookkeeping.
  }
}
