/**
 * Shared between middleware (edge runtime, no Prisma) and server code —
 * kept in its own file so middleware never pulls in `@/lib/prisma`.
 */
export const REFERRAL_COOKIE = 'sd_ref';
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
