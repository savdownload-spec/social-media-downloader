import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getBillingSummary } from '@/lib/billing';
import { allocateCreditDebit } from '@/lib/credit-semantics';

export { allocateCreditDebit } from '@/lib/credit-semantics';

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
  duplicate: boolean;
};

export type CreditGate =
  | {
      ok: true;
      userId: string;
      spend: (operation: ToolOperationInput) => Promise<boolean>;
      fail: (operation: Omit<ToolOperationInput, 'description'> & { description?: string }) => Promise<string | null>;
    }
  | { ok: false; response: NextResponse };

type GateOptions = {
  /** Total amount authorized for this request (all items in a batch). */
  cost: number;
  plainText?: boolean;
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
export async function requireCredits({ cost, plainText }: GateOptions): Promise<CreditGate> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, response: errorResponse('Sign in to use SavDown tools. Every account gets free daily credits.', 401, plainText) };
  }

  const summary = await getBillingSummary(userId);
  if (!summary) return { ok: false, response: errorResponse('Account not found.', 401, plainText) };
  if (summary.role === 'SUSPENDED') {
    return { ok: false, response: errorResponse('This account has been suspended.', 403, plainText) };
  }
  if (cost > 0 && summary.totalCredits < cost) {
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
      failureReason: operation.failureReason ?? operation.description ?? 'Processing failed',
    }),
  };
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
            duplicate: true,
          };
        }
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { planCredits: true, purchasedCredits: true },
      });
      if (!user) return null;
      const allocation = allocateCreditDebit(user.planCredits, user.purchasedCredits, amount);
      if (!allocation) return null;
      const { fromPlan, fromPurchased, nextPlan, nextPurchased } = allocation;

      const updated = await tx.user.updateMany({
        where: { id: userId, planCredits: user.planCredits, purchasedCredits: user.purchasedCredits },
        data: { planCredits: nextPlan, purchasedCredits: nextPurchased },
      });
      if (updated.count !== 1) throw retryableConflict();

      const now = new Date();
      const op = operation.operationId
        ? await tx.download.update({
            where: { id: operation.operationId, userId },
            data: {
              status,
              creditCost: { increment: amount },
              failureReason: null,
              ...(status === 'success' ? { completedAt: now } : {}),
            },
          })
        : await upsertOperation(tx, userId, operation, status, amount, scopedKey, now);

      const ledger = await tx.creditTransaction.create({
        data: {
          userId,
          operationId: op.id,
          amount: -amount,
          kind: 'spend',
          bucket: fromPlan > 0 && fromPurchased > 0 ? 'mixed' : fromPlan > 0 ? 'plan' : 'purchased',
          description: operation.description,
          idempotencyKey: scopedKey ? `${scopedKey}:spend` : null,
          planDelta: -fromPlan,
          purchasedDelta: -fromPurchased,
          planBalanceAfter: nextPlan,
          purchasedBalanceAfter: nextPurchased,
          balanceAfter: nextPlan + nextPurchased,
        },
      });

      return {
        operationId: op.id,
        transactionId: ledger.id,
        amount,
        planCredits: fromPlan,
        purchasedCredits: fromPurchased,
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
          duplicate: true,
        };
      }
    }
    throw error;
  }
}

/** Record a non-credit or failed operation without manufacturing a ledger event. */
export async function recordToolOperation(
  userId: string,
  operation: Omit<ToolOperationInput, 'description'> & {
    description?: string;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    creditCost?: number;
  },
): Promise<string | null> {
  const scopedKey = scopeKey(userId, operation.idempotencyKey);
  const now = new Date();
  const data = {
    platform: operation.platform,
    tool: operation.tool,
    sourceUrl: operation.sourceUrl ?? `tool://${operation.tool}`,
    status: operation.status,
    idempotencyKey: scopedKey,
    batchId: operation.batchId ?? null,
    failureReason: operation.failureReason ?? null,
    creditCost: operation.creditCost ?? 0,
    userId,
    ipHash: operation.ipHash ?? null,
    userAgent: operation.userAgent ?? null,
    completedAt: operation.status === 'pending' ? null : now,
  };

  try {
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
): Promise<{ refunded: boolean; transactionId?: string }> {
  return serializable(async (tx) => {
    const spend = await tx.creditTransaction.findUnique({ where: { id: spendTransactionId } });
    if (!spend || spend.userId !== userId || spend.kind !== 'spend') return { refunded: false };
    const refundKey = `${spend.id}:refund`;
    const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey: refundKey } });
    if (existing) return { refunded: false, transactionId: existing.id };

    const planDelta = Math.abs(spend.planDelta);
    const purchasedDelta = Math.abs(spend.purchasedDelta);
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        planCredits: { increment: planDelta },
        purchasedCredits: { increment: purchasedDelta },
      },
      select: { planCredits: true, purchasedCredits: true },
    });
    const refund = await tx.creditTransaction.create({
      data: {
        userId,
        operationId: spend.operationId,
        amount: planDelta + purchasedDelta,
        kind: 'refund',
        bucket: planDelta > 0 && purchasedDelta > 0 ? 'mixed' : planDelta > 0 ? 'plan' : 'purchased',
        description: reason,
        idempotencyKey: refundKey,
        planDelta,
        purchasedDelta,
        planBalanceAfter: user.planCredits,
        purchasedBalanceAfter: user.purchasedCredits,
        balanceAfter: user.planCredits + user.purchasedCredits,
      },
    });
    if (markOperationFailed && spend.operationId) {
      await tx.download.update({
        where: { id: spend.operationId },
        data: { status: 'failed', failureReason: reason, completedAt: new Date() },
      });
    }
    return { refunded: true, transactionId: refund.id };
  });
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
