import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getBillingSummary } from '@/lib/billing';
import { allocateCreditDebitWithReferral } from '@/lib/credit-semantics';
import { expireReferralRewardsInTransaction } from '@/lib/affiliates';
import { getClientId } from '@/lib/ratelimit';
import { sha256 } from '@/lib/utils';

export { allocateCreditDebit, allocateCreditDebitWithReferral } from '@/lib/credit-semantics';

/** Credit prices shared by every delivery/processing route. */
export const JOB_COST = {
  proxyDownload: 1,
  mergeDownload: 1,
  merge4k: 2,
  videoTool: 2,
  imageTool: 1,
  pdfTool: 1,
  qrTool: 1,
} as const;

export function costForHeight(height: number): number {
  return height >= 2160 ? JOB_COST.merge4k : JOB_COST.mergeDownload;
}

export type ToolOperationInput = {
  tool: string;
  platform: string;
  description: string;
  sourceUrl?: string;
  operationId?: string;
  idempotencyKey?: string | null;
  batchId?: string | null;
  failureReason?: string | null;
  failureCode?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  /** Per-item cost. Batch gates authorize the sum and spend once per item. */
  cost?: number;
};

export type CreditSpend = {
  operationId: string;
  transactionId: string;
  amount: number;
  planCredits: number;
  purchasedCredits: number;
  referralCredits: number;
  duplicate: boolean;
};

export type CreditGate =
  | {
      ok: true;
      userId: string;
      spend: (operation: ToolOperationInput) => Promise<boolean>;
      fail: (operation: Omit<ToolOperationInput, 'description'> & { description?: string }) => Promise<string | null>;
      begin: (operation: Omit<ToolOperationInput, 'description'> & { description?: string }) => Promise<string | null>;
    }
  | { ok: false; response: NextResponse };

type GateOptions = {
  /** Total amount authorized for this request (all items in a batch). */
  cost: number;
  plainText?: boolean;
  request?: Request;
  operation?: Omit<ToolOperationInput, 'description'> & { description?: string };
};

export function requestIdempotencyKey(request: Request, suffix?: string): string | null {
  const raw = request.headers.get('idempotency-key') ?? request.headers.get('x-idempotency-key');
  if (!raw || !/^[A-Za-z0-9._:-]{8,128}$/.test(raw)) return null;
  return suffix ? `${raw}:${suffix}`.slice(0, 160) : raw;
}

export function newIdempotencyKey(prefix: string): string {
  return `${prefix}:${randomUUID()}`;
}

/**
 * Authenticate and preflight the request balance. The final debit remains an
 * atomic conditional transaction; this read is only an early, friendly error.
 */
export async function requireCredits({ cost, plainText, request, operation }: GateOptions): Promise<CreditGate> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    await recordGateFailure(null, request, operation, 'auth_required', 'Authentication required');
    return { ok: false, response: errorResponse('Sign in to use SavDown tools. Every account gets free daily credits.', 401, plainText) };
  }

  const summary = await getBillingSummary(userId);
  if (!summary) {
    await recordGateFailure(null, request, operation, 'account_not_found', 'Account not found');
    return { ok: false, response: errorResponse('Account not found.', 401, plainText) };
  }
  if (summary.role === 'SUSPENDED') {
    await recordGateFailure(userId, request, operation, 'account_suspended', 'Account suspended');
    return { ok: false, response: errorResponse('This account has been suspended.', 403, plainText) };
  }
  if (cost > 0 && summary.totalCredits < cost) {
    await recordGateFailure(userId, request, operation, 'insufficient_credits', 'Insufficient credits');
    return {
      ok: false,
      response: errorResponse(
        `You need ${cost} credit${cost === 1 ? '' : 's'} for this and have ${summary.totalCredits}. Your free credits refresh soon, or you can top up at /pricing.`,
        402,
        plainText,
      ),
    };
  }

  let committed = 0;
  return {
    ok: true,
    userId,
    spend: async (operation) => {
      const charge = operation.cost ?? cost;
      if (!Number.isInteger(charge) || charge < 0 || committed + charge > cost) return false;
      if (charge === 0) {
        const id = await recordToolOperation(userId, { ...operation, status: 'success', creditCost: 0 });
        return Boolean(id);
      }
      const result = await spendCreditsDetailed(userId, charge, operation);
      if (result) committed += charge;
      return Boolean(result);
    },
    fail: (operation) => recordToolOperation(userId, {
      ...operation,
      status: 'failed',
      creditCost: 0,
      failureCode: operation.failureCode ?? 'processing_failed',
      failureReason: operation.failureReason ?? operation.description ?? 'Processing failed',
    }),
    begin: (operation) => recordToolOperation(userId, {
      ...operation,
      status: 'processing',
      creditCost: 0,
      failureReason: null,
      failureCode: null,
    }),
  };
}

async function recordGateFailure(
  userId: string | null,
  request: Request | undefined,
  operation: GateOptions['operation'],
  failureCode: string,
  failureReason: string,
) {
  if (!operation) return;
  try {
    const ipHash = request ? await sha256(getClientId(request)) : null;
    await recordToolOperation(userId, {
      ...operation,
      idempotencyKey: operation.idempotencyKey ?? (request ? requestIdempotencyKey(request) : null),
      ipHash: operation.ipHash ?? ipHash,
      userAgent: operation.userAgent ?? request?.headers.get('user-agent') ?? null,
      status: 'failed',
      creditCost: 0,
      failureCode,
      failureReason,
    });
  } catch (error) {
    console.error('Operation rejection tracking failed', { failureCode, error });
  }
}

/** Record a rejected request that could not enter the authenticated credit gate. */
export function recordRejectedOperation(
  request: Request,
  operation: GateOptions['operation'],
  failureCode: string,
  failureReason: string,
) {
  return recordGateFailure(null, request, operation, failureCode, failureReason);
}

export async function spendCredits(
  userId: string,
  amount: number,
  operation: ToolOperationInput,
): Promise<boolean> {
  return Boolean(await spendCreditsDetailed(userId, amount, operation));
}

/** Atomically creates/completes the operation, debits balances, and appends the ledger row. */
export async function spendCreditsDetailed(
  userId: string,
  amount: number,
  operation: ToolOperationInput,
  status: 'pending' | 'success' = 'success',
): Promise<CreditSpend | null> {
  if (!Number.isInteger(amount) || amount <= 0) return null;
  const scopedKey = scopeKey(userId, operation.idempotencyKey);

  try {
    return await serializable(async (tx) => {
      if (scopedKey) {
        const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey: `${scopedKey}:spend` } });
        if (existing?.operationId && existing.userId === userId && existing.kind === 'spend') {
          return {
            operationId: existing.operationId,
            transactionId: existing.id,
            amount: Math.abs(existing.amount),
            planCredits: Math.abs(existing.planDelta),
            purchasedCredits: Math.abs(existing.purchasedDelta),
            referralCredits: Math.abs(existing.referralDelta),
            duplicate: true,
          };
        }
      }

      const now = new Date();
      await expireReferralRewardsInTransaction(tx, userId, now);
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { planCredits: true, purchasedCredits: true, referralCredits: true },
      });
      if (!user) return null;
      const allocation = allocateCreditDebitWithReferral(user.planCredits, user.referralCredits, user.purchasedCredits, amount);
      if (!allocation) return null;
      const { fromPlan, fromReferral, fromPurchased, nextPlan, nextReferral, nextPurchased } = allocation;

      const referralAllocations: Array<{ referralId: string; amount: number }> = [];
      let referralAmountLeft = fromReferral;
      if (referralAmountLeft > 0) {
        const lots = await tx.referral.findMany({
          where: { referredUserId: userId, status: 'QUALIFIED', remainingCredits: { gt: 0 }, expiresAt: { gt: now } },
          orderBy: [{ expiresAt: 'asc' }, { rewardedAt: 'asc' }],
          select: { id: true, remainingCredits: true },
        });
        for (const lot of lots) {
          const used = Math.min(lot.remainingCredits, referralAmountLeft);
          if (used <= 0) break;
          const updatedLot = await tx.referral.updateMany({
            where: { id: lot.id, remainingCredits: { gte: used }, expiresAt: { gt: now } },
            data: { remainingCredits: { decrement: used } },
          });
          if (updatedLot.count !== 1) throw retryableConflict();
          referralAllocations.push({ referralId: lot.id, amount: used });
          referralAmountLeft -= used;
        }
        if (referralAmountLeft > 0) throw retryableConflict();
      }

      const updated = await tx.user.updateMany({
        where: {
          id: userId,
          planCredits: user.planCredits,
          purchasedCredits: user.purchasedCredits,
          referralCredits: user.referralCredits,
        },
        data: { planCredits: nextPlan, purchasedCredits: nextPurchased, referralCredits: nextReferral },
      });
      if (updated.count !== 1) throw retryableConflict();

      const op = operation.operationId
        ? await tx.download.update({
            where: { id: operation.operationId, userId },
            data: {
              status,
              creditCost: { increment: amount },
              failureReason: null,
              failureCode: null,
              ...(status === 'success' ? { completedAt: now } : {}),
            },
          })
        : await upsertOperation(tx, userId, operation, status, amount, scopedKey, now);

      const usedBuckets = [fromPlan, fromReferral, fromPurchased].filter((value) => value > 0).length;
      const bucket = usedBuckets > 1 ? 'mixed' : fromPlan > 0 ? 'plan' : fromReferral > 0 ? 'referral' : 'purchased';
      const ledger = await tx.creditTransaction.create({
        data: {
          userId,
          operationId: op.id,
          amount: -amount,
          kind: 'spend',
          bucket,
          description: operation.description,
          idempotencyKey: scopedKey ? `${scopedKey}:spend` : null,
          planDelta: -fromPlan,
          purchasedDelta: -fromPurchased,
          referralDelta: -fromReferral,
          planBalanceAfter: nextPlan,
          purchasedBalanceAfter: nextPurchased,
          referralBalanceAfter: nextReferral,
          balanceAfter: nextPlan + nextPurchased + nextReferral,
        },
      });
      if (referralAllocations.length > 0) {
        await tx.creditAllocation.createMany({
          data: referralAllocations.map((allocation) => ({
            referralId: allocation.referralId,
            spendTransactionId: ledger.id,
            amount: allocation.amount,
          })),
        });
      }

      return {
        operationId: op.id,
        transactionId: ledger.id,
        amount,
        planCredits: fromPlan,
        purchasedCredits: fromPurchased,
        referralCredits: fromReferral,
        duplicate: false,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error) && scopedKey) {
      const existing = await prisma.creditTransaction.findUnique({ where: { idempotencyKey: `${scopedKey}:spend` } });
      if (existing?.operationId && existing.userId === userId) {
        return {
          operationId: existing.operationId,
          transactionId: existing.id,
          amount: Math.abs(existing.amount),
          planCredits: Math.abs(existing.planDelta),
          purchasedCredits: Math.abs(existing.purchasedDelta),
          referralCredits: Math.abs(existing.referralDelta),
          duplicate: true,
        };
      }
    }
    throw error;
  }
}

/** Record a non-credit or failed operation without manufacturing a ledger event. */
export async function recordToolOperation(
  userId: string | null,
  operation: Omit<ToolOperationInput, 'description'> & {
    description?: string;
    status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
    creditCost?: number;
  },
): Promise<string | null> {
  const scopedKey = scopeKey(userId ?? `anonymous:${operation.ipHash ?? 'unknown'}`, operation.idempotencyKey);
  const now = new Date();
  const data = {
    platform: operation.platform,
    tool: operation.tool,
    sourceUrl: operation.sourceUrl ?? `tool://${operation.tool}`,
    status: operation.status,
    idempotencyKey: scopedKey,
    batchId: operation.batchId ?? null,
    failureReason: operation.failureReason ?? null,
    failureCode: operation.failureCode ?? (operation.status === 'failed' ? 'processing_failed' : null),
    creditCost: operation.creditCost ?? 0,
    userId,
    ipHash: operation.ipHash ?? null,
    userAgent: operation.userAgent ?? null,
    completedAt: operation.status === 'pending' || operation.status === 'processing' ? null : now,
  };

  try {
    if (scopedKey && userId) {
      const existingSpend = await prisma.creditTransaction.findUnique({
        where: { idempotencyKey: `${scopedKey}:spend` },
        select: { userId: true, operationId: true },
      });
      if (existingSpend?.userId === userId && existingSpend.operationId) return existingSpend.operationId;
    }
    if (operation.operationId && userId) {
      const updated = await prisma.download.updateMany({
        where: {
          id: operation.operationId,
          userId,
          creditTransactions: { none: { kind: 'spend' } },
        },
        data: {
          platform: operation.platform,
          tool: operation.tool,
          sourceUrl: operation.sourceUrl ?? `tool://${operation.tool}`,
          status: operation.status,
          batchId: operation.batchId ?? null,
          failureReason: data.failureReason,
          failureCode: data.failureCode,
          creditCost: data.creditCost,
          ...(operation.ipHash ? { ipHash: operation.ipHash } : {}),
          ...(operation.userAgent ? { userAgent: operation.userAgent } : {}),
          completedAt: data.completedAt,
        },
      });
      if (updated.count === 1) return operation.operationId;
    }
    if (!scopedKey) return (await prisma.download.create({ data })).id;
    const existing = await prisma.download.findUnique({ where: { idempotencyKey: scopedKey } });
    if (existing) {
      if (existing.userId !== userId) return null;
      if (existing.status === 'success' || existing.status === 'failed') return existing.id;
      return (await prisma.download.update({ where: { id: existing.id }, data })).id;
    }
    return (await prisma.download.create({ data })).id;
  } catch (error) {
    if (isUniqueViolation(error) && scopedKey) {
      return (await prisma.download.findUnique({ where: { idempotencyKey: scopedKey }, select: { id: true } }))?.id ?? null;
    }
    throw error;
  }
}

/** Restore exactly the buckets used by a spend. The spend id makes this idempotent. */
export async function refundCreditSpend(
  userId: string,
  spendTransactionId: string,
  reason: string,
  markOperationFailed = true,
  failureCode = 'processing_failed',
): Promise<{ refunded: boolean; transactionId?: string }> {
  return serializable(async (tx) => {
    const spend = await tx.creditTransaction.findUnique({ where: { id: spendTransactionId } });
    if (!spend || spend.userId !== userId || spend.kind !== 'spend') return { refunded: false };
    const refundKey = `${spend.id}:refund`;
    const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey: refundKey } });
    if (existing) return { refunded: false, transactionId: existing.id };

    const now = new Date();
    await expireReferralRewardsInTransaction(tx, userId, now);
    const planDelta = Math.abs(spend.planDelta);
    const purchasedDelta = Math.abs(spend.purchasedDelta);
    const allocations = await tx.creditAllocation.findMany({
      where: { spendTransactionId: spend.id },
      include: { referral: { select: { status: true, expiresAt: true } } },
    });
    let referralDelta = 0;
    for (const allocation of allocations) {
      const refundable = allocation.amount - allocation.refundedAmount;
      if (refundable <= 0 || allocation.referral.status !== 'QUALIFIED' || !allocation.referral.expiresAt || allocation.referral.expiresAt <= now) continue;
      const restored = await tx.referral.updateMany({
        where: { id: allocation.referralId, status: 'QUALIFIED', expiresAt: { gt: now } },
        data: { remainingCredits: { increment: refundable } },
      });
      if (restored.count !== 1) continue;
      await tx.creditAllocation.update({ where: { id: allocation.id }, data: { refundedAmount: { increment: refundable } } });
      referralDelta += refundable;
    }

    const user = await tx.user.update({
      where: { id: userId },
      data: {
        planCredits: { increment: planDelta },
        purchasedCredits: { increment: purchasedDelta },
        referralCredits: { increment: referralDelta },
      },
      select: { planCredits: true, purchasedCredits: true, referralCredits: true },
    });
    const amount = planDelta + purchasedDelta + referralDelta;
    const usedBuckets = [planDelta, referralDelta, purchasedDelta].filter((value) => value > 0).length;
    const bucket = usedBuckets > 1 ? 'mixed' : planDelta > 0 ? 'plan' : referralDelta > 0 ? 'referral' : purchasedDelta > 0 ? 'purchased' : 'referral';
    const expiredReferralAmount = Math.max(0, Math.abs(spend.referralDelta) - referralDelta);
    const refund = await tx.creditTransaction.create({
      data: {
        userId,
        operationId: spend.operationId,
        amount,
        kind: 'refund',
        bucket,
        description: expiredReferralAmount > 0 ? `${reason}; ${expiredReferralAmount} expired referral credits were not restored` : reason,
        idempotencyKey: refundKey,
        planDelta,
        purchasedDelta,
        referralDelta,
        planBalanceAfter: user.planCredits,
        purchasedBalanceAfter: user.purchasedCredits,
        referralBalanceAfter: user.referralCredits,
        balanceAfter: user.planCredits + user.purchasedCredits + user.referralCredits,
      },
    });
    if (markOperationFailed && spend.operationId) {
      await tx.download.update({
        where: { id: spend.operationId },
        data: { status: 'failed', failureReason: reason, failureCode, completedAt: new Date() },
      });
    }
    return { refunded: true, transactionId: refund.id };
  });
}

/**
 * Close operations that outlived every supported server execution window.
 * Reserved credits are restored through the same idempotent refund path used
 * by ordinary processing failures; uncharged attempts are only marked failed.
 */
export async function reconcileStaleOperations(maxAgeMinutes = 30): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60_000);
  const stale = await prisma.download.findMany({
    where: { status: { in: ['pending', 'processing'] }, createdAt: { lt: cutoff } },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      id: true,
      userId: true,
      creditTransactions: {
        where: { kind: { in: ['spend', 'refund'] } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, kind: true },
      },
    },
  });

  for (const operation of stale) {
    const spend = operation.creditTransactions.find((row) => row.kind === 'spend');
    const refunded = operation.creditTransactions.some((row) => row.kind === 'refund');
    if (spend && operation.userId && !refunded) {
      await refundCreditSpend(
        operation.userId,
        spend.id,
        'Processing was interrupted before completion; reserved credits released',
        true,
        'processing_interrupted',
      );
      continue;
    }
    await prisma.download.updateMany({
      where: { id: operation.id, status: { in: ['pending', 'processing'] } },
      data: {
        status: 'failed',
        failureCode: 'processing_interrupted',
        failureReason: 'Processing was interrupted before completion',
        completedAt: new Date(),
      },
    });
  }
  return stale.length;
}

async function upsertOperation(
  tx: Prisma.TransactionClient,
  userId: string,
  operation: ToolOperationInput,
  status: 'pending' | 'success',
  amount: number,
  scopedKey: string | null,
  now: Date,
) {
  const data = {
    platform: operation.platform,
    tool: operation.tool,
    sourceUrl: operation.sourceUrl ?? `tool://${operation.tool}`,
    status,
    idempotencyKey: scopedKey,
    batchId: operation.batchId ?? null,
    failureReason: operation.failureReason ?? null,
    failureCode: operation.failureCode ?? null,
    creditCost: amount,
    userId,
    ipHash: operation.ipHash ?? null,
    userAgent: operation.userAgent ?? null,
    completedAt: status === 'success' ? now : null,
  };
  if (!scopedKey) return tx.download.create({ data });
  return tx.download.upsert({
    where: { idempotencyKey: scopedKey },
    create: data,
    update: {
      status,
      creditCost: amount,
      failureReason: null,
      failureCode: null,
      ...(status === 'success' ? { completedAt: now } : {}),
    },
  });
}

function scopeKey(userId: string, key?: string | null): string | null {
  if (!key) return null;
  return `${userId}:${key}`.slice(0, 190);
}

async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 10_000,
      });
    } catch (error) {
      if (!isTransactionConflict(error) || attempt === 2) throw error;
    }
  }
  throw new Error('Unreachable transaction retry state');
}

function retryableConflict() {
  return new Prisma.PrismaClientKnownRequestError('Concurrent credit update', {
    code: 'P2034',
    clientVersion: Prisma.prismaVersion.client,
  });
}

function isTransactionConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2034';
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'P2002';
}

function errorResponse(message: string, status: number, plainText?: boolean) {
  return plainText ? new NextResponse(message, { status }) : NextResponse.json({ ok: false, error: message }, { status });
}
