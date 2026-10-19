import { Prisma, type Referral } from '@prisma/client';
import { prisma } from './prisma';
import {
  DEFAULT_REFERRAL_CREDIT_USD_RATE,
  REFERRAL_CREDIT_VALUE_SETTING,
  REFERRAL_REWARD_CREDITS,
} from './affiliates-constants';

export { REFERRAL_COOKIE } from './affiliates-constants';

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

function isRetryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
}

/** One UTC calendar month, clamped to the last valid day of the target month. */
export function addReferralExpiryMonth(grantedAt: Date): Date {
  const year = grantedAt.getUTCFullYear();
  const month = grantedAt.getUTCMonth() + 1;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = month % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    Math.min(grantedAt.getUTCDate(), lastDay),
    grantedAt.getUTCHours(),
    grantedAt.getUTCMinutes(),
    grantedAt.getUTCSeconds(),
    grantedAt.getUTCMilliseconds(),
  ));
}

export async function getReferralCreditUsdRate(
  tx: Pick<Prisma.TransactionClient, 'adminSetting'> = prisma,
): Promise<number> {
  const setting = await tx.adminSetting.findUnique({ where: { key: REFERRAL_CREDIT_VALUE_SETTING } });
  const parsed = Number(setting?.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_REFERRAL_CREDIT_USD_RATE;
}

async function grantReferralReward(
  tx: Prisma.TransactionClient,
  referral: Referral,
  rate: number,
) {
  const user = await tx.user.findUnique({
    where: { id: referral.referredUserId },
    select: { planCredits: true, purchasedCredits: true, referralCredits: true },
  });
  const usdValue = new Prisma.Decimal(rate).mul(REFERRAL_REWARD_CREDITS).toDecimalPlaces(6);
  if (!user || !referral.expiresAt) throw new Error('Referral reward recipient is unavailable');

  const nextReferralCredits = user.referralCredits + REFERRAL_REWARD_CREDITS;
  await tx.user.update({ where: { id: referral.referredUserId }, data: { referralCredits: nextReferralCredits } });
  await tx.referral.update({ where: { id: referral.id }, data: { estimatedUsdValue: usdValue } });
  await tx.creditTransaction.create({
    data: {
      userId: referral.referredUserId,
      amount: REFERRAL_REWARD_CREDITS,
      kind: 'referral_reward',
      bucket: 'referral',
      description: `Referral reward for ${referral.code}`,
      idempotencyKey: `referral:${referral.id}:reward`,
      referralId: referral.id,
      expiresAt: referral.expiresAt,
      referralDelta: REFERRAL_REWARD_CREDITS,
      referralBalanceAfter: nextReferralCredits,
      planBalanceAfter: user.planCredits,
      purchasedBalanceAfter: user.purchasedCredits,
      balanceAfter: user.planCredits + user.purchasedCredits + nextReferralCredits,
    },
  });
}

/** Transactional core for new-user registration and OAuth account creation. */
export async function attributeReferralSignupInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  refCode: string | undefined | null,
  qualifies: boolean,
): Promise<void> {
  if (!refCode || !/^[a-z0-9-]{1,40}$/i.test(refCode)) return;

  const alreadyAttributed = await tx.referral.findUnique({ where: { referredUserId: userId }, select: { id: true } });
  if (alreadyAttributed) return;

  const [affiliate, user] = await Promise.all([
    tx.affiliate.findUnique({ where: { code: refCode }, select: { id: true, userId: true, status: true } }),
    tx.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  if (!affiliate || !user) return;

  const selfReferral = affiliate.userId === userId;
  const eligibleAffiliate = affiliate.status === 'ACTIVE';
  const status = selfReferral || !eligibleAffiliate
    ? 'REJECTED'
    : qualifies ? 'QUALIFIED' : 'PENDING';
  const now = new Date();
  const expiresAt = status === 'QUALIFIED' ? addReferralExpiryMonth(now) : null;
  const reason = selfReferral ? 'self_referral' : !eligibleAffiliate ? 'affiliate_not_active' : null;
  const referral = await tx.referral.create({
    data: {
      affiliateId: affiliate.id,
      referredUserId: userId,
      code: refCode,
      status,
      rejectionReason: reason,
      ...(status === 'QUALIFIED' ? {
        rewardCredits: REFERRAL_REWARD_CREDITS,
        remainingCredits: REFERRAL_REWARD_CREDITS,
        qualifiedAt: now,
        rewardedAt: now,
        expiresAt,
      } : {}),
    },
  });

  if (status === 'QUALIFIED') await grantReferralReward(tx, referral, await getReferralCreditUsdRate(tx));
}

/**
 * Complete a Google referral held pending an explicitly verified email.
 * Qualification and the 20-credit ledger grant share a single transaction.
 */
export async function qualifyPendingReferralInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  const referral = await tx.referral.findUnique({
    where: { referredUserId: userId },
    include: { affiliate: { select: { status: true } } },
  });
  if (!referral || referral.status !== 'PENDING') return;

  if (referral.affiliate.status !== 'ACTIVE') {
    await tx.referral.updateMany({
      where: { id: referral.id, status: 'PENDING' },
      data: { status: 'REJECTED', rejectionReason: 'affiliate_not_active_at_verification' },
    });
    return;
  }

  const now = new Date();
  const expiresAt = addReferralExpiryMonth(now);
  const changed = await tx.referral.updateMany({
    where: { id: referral.id, status: 'PENDING' },
    data: {
      status: 'QUALIFIED',
      rewardCredits: REFERRAL_REWARD_CREDITS,
      remainingCredits: REFERRAL_REWARD_CREDITS,
      expiredCredits: 0,
      qualifiedAt: now,
      rewardedAt: now,
      expiresAt,
      rejectionReason: null,
    },
  });
  if (changed.count !== 1) return;

  const updated = await tx.referral.findUnique({ where: { id: referral.id } });
  if (!updated) throw new Error('Referral disappeared during qualification');
  await grantReferralReward(tx, updated, await getReferralCreditUsdRate(tx));
}

export async function runSerializableTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if ((!isRetryableTransactionError(error) && !isUniqueViolation(error)) || attempt === 2) throw error;
    }
  }
  throw new Error('Serializable transaction retry limit reached');
}

async function runRetryableTransaction(work: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await runSerializableTransaction(work);
  } catch (error) {
    if (isUniqueViolation(error)) return;
    throw error;
  }
}

/** Standalone helper for workflows that already created the new account. */
export function attributeReferralSignup(userId: string, refCode: string | undefined | null, qualifies: boolean) {
  return runRetryableTransaction((tx) => attributeReferralSignupInTransaction(tx, userId, refCode, qualifies));
}

export function qualifyPendingReferral(userId: string) {
  return runRetryableTransaction((tx) => qualifyPendingReferralInTransaction(tx, userId));
}

/**
 * Lazily expires unused referral credits in a serializable transaction. The
 * balance is also checked in the spending transaction, so an expired reward
 * cannot be used even when an account has not been opened recently.
 */
export async function expireReferralRewardsInTransaction(
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date = new Date(),
): Promise<void> {
  const rewards = await tx.referral.findMany({
    where: { referredUserId: userId, status: 'QUALIFIED', remainingCredits: { gt: 0 }, expiresAt: { lte: now } },
    orderBy: [{ expiresAt: 'asc' }, { rewardedAt: 'asc' }],
    select: { id: true, remainingCredits: true, expiresAt: true },
  });
  if (rewards.length === 0) return;

  const current = await tx.user.findUnique({
    where: { id: userId },
    select: { planCredits: true, purchasedCredits: true, referralCredits: true },
  });
  if (!current) return;
  const totalToExpire = rewards.reduce((sum, reward) => sum + reward.remainingCredits, 0);
  if (current.referralCredits < totalToExpire) throw new Error('Referral credit balance is inconsistent');

  let balance = current.referralCredits;
  for (const reward of rewards) {
    const expirationKey = `referral:${reward.id}:expiration`;
    if (await tx.creditTransaction.findUnique({ where: { idempotencyKey: expirationKey }, select: { id: true } })) continue;

    const updated = await tx.referral.updateMany({
      where: { id: reward.id, remainingCredits: reward.remainingCredits, expiresAt: { lte: now } },
      data: { remainingCredits: 0, expiredCredits: { increment: reward.remainingCredits } },
    });
    if (updated.count !== 1) continue;

    balance -= reward.remainingCredits;
    await tx.user.update({ where: { id: userId }, data: { referralCredits: { decrement: reward.remainingCredits } } });
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -reward.remainingCredits,
        kind: 'expiration',
        bucket: 'referral',
        description: 'Unused referral reward credits expired',
        idempotencyKey: expirationKey,
        expiresAt: reward.expiresAt,
        referralDelta: -reward.remainingCredits,
        referralBalanceAfter: balance,
        planBalanceAfter: current.planCredits,
        purchasedBalanceAfter: current.purchasedCredits,
        balanceAfter: current.planCredits + current.purchasedCredits + balance,
      },
    });
  }
}

export async function expireReferralRewards(userId: string, now: Date = new Date()): Promise<void> {
  await runRetryableTransaction((tx) => expireReferralRewardsInTransaction(tx, userId, now));
}

export type ReferralSummary = {
  signups: number;
  legacySignups: number;
  qualifyingReferrals: number;
  rewardsIssued: number;
  activeRewardCredits: number;
  expiredRewardCredits: number;
};

export async function getAffiliateReferralSummary(affiliateId: string, now: Date = new Date()): Promise<ReferralSummary> {
  const [affiliate, signups, qualifyingReferrals, issued, active, expiredUnused, unprocessedExpired] = await Promise.all([
    prisma.affiliate.findUnique({ where: { id: affiliateId }, select: { totalSignups: true } }),
    prisma.referral.count({ where: { affiliateId, status: { in: ['PENDING', 'QUALIFIED'] } } }),
    prisma.referral.count({ where: { affiliateId, status: 'QUALIFIED' } }),
    prisma.referral.aggregate({ where: { affiliateId, status: 'QUALIFIED' }, _sum: { rewardCredits: true } }),
    prisma.referral.aggregate({ where: { affiliateId, status: 'QUALIFIED', expiresAt: { gt: now } }, _sum: { remainingCredits: true } }),
    prisma.referral.aggregate({ where: { affiliateId, status: 'QUALIFIED' }, _sum: { expiredCredits: true } }),
    prisma.referral.aggregate({ where: { affiliateId, status: 'QUALIFIED', expiresAt: { lte: now } }, _sum: { remainingCredits: true } }),
  ]);
  const legacySignups = affiliate?.totalSignups ?? 0;
  return {
    signups: legacySignups + signups,
    legacySignups,
    qualifyingReferrals,
    rewardsIssued: issued._sum.rewardCredits ?? 0,
    activeRewardCredits: active._sum.remainingCredits ?? 0,
    expiredRewardCredits: (expiredUnused._sum.expiredCredits ?? 0) + (unprocessedExpired._sum.remainingCredits ?? 0),
  };
}

export function referralRewardStatus(referral: Pick<Referral, 'status' | 'remainingCredits' | 'expiredCredits' | 'expiresAt'>, now: Date = new Date()) {
  if (referral.status === 'PENDING') return 'PENDING';
  if (referral.status !== 'QUALIFIED') return 'NOT_QUALIFIED';
  if (referral.expiredCredits > 0 || (referral.remainingCredits > 0 && referral.expiresAt && referral.expiresAt <= now)) return 'EXPIRED';
  return referral.remainingCredits > 0 ? 'ACTIVE' : 'USED';
}
