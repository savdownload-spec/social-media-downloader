/**
 * Shared between middleware (edge runtime, no Prisma) and server code —
 * kept in its own file so middleware never pulls in `@/lib/prisma`.
 */
export const REFERRAL_COOKIE = 'sd_ref';
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
export const REFERRAL_REWARD_CREDITS = 20;
export const REFERRAL_CREDIT_VALUE_SETTING = 'affiliate_credit_usd_per_credit';
/** Rounded estimate based on the current $9.99 Pro price for 1,000 credits. */
export const DEFAULT_REFERRAL_CREDIT_USD_RATE = 0.00999;
