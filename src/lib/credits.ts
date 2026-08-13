import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getBillingSummary } from '@/lib/billing';

/**
 * Credit metering for the tool routes.
 *
 * Two rules keep this honest:
 *
 *   1. Credits are spent where the work actually happens — the delivery routes
 *      that download, merge, transcode or convert. `/api/download` only reads
 *      metadata, so it is free; charging there and again at delivery would
 *      bill twice for one file.
 *   2. Nothing is charged until the job succeeds. Callers run the work first
 *      and then call `spend()`, so a failed render never costs a credit.
 */

/** What each kind of job costs. Mirrored by the table on /pricing. */
export const JOB_COST = {
  /** Progressive video, audio and image files served straight from the CDN. */
  proxyDownload: 1,
  /** Server-side yt-dlp + FFmpeg mux. 4K is charged double — see costForHeight. */
  mergeDownload: 1,
  merge4k: 2,
  /** Re-encoding work. */
  videoTool: 2,
  /** Single-file conversions. */
  imageTool: 1,
  pdfTool: 1,
  qrTool: 1,
} as const;

/** 4K and above costs two credits, matching the published cost table. */
export function costForHeight(height: number): number {
  return height >= 2160 ? JOB_COST.merge4k : JOB_COST.mergeDownload;
}

export type CreditGate =
  | { ok: true; userId: string; spend: (description: string) => Promise<void> }
  | { ok: false; response: NextResponse };

type GateOptions = {
  /** Credits to charge on success. Pass 0 to require an account without charging. */
  cost: number;
  /** Return errors as plain text rather than JSON (for routes that stream files). */
  plainText?: boolean;
};

/**
 * Gates a tool route: requires a signed-in account, checks the balance up
 * front, and hands back a `spend()` to call once the job has succeeded.
 *
 * Returns a ready-made 401/402 response when the caller cannot proceed, so
 * routes stay a single early-return.
 */
export async function requireCredits({ cost, plainText }: GateOptions): Promise<CreditGate> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return {
      ok: false,
      response: errorResponse(
        'Sign in to use SavDown tools. Every account gets free daily credits.',
        401,
        plainText,
      ),
    };
  }

  // Reads through the lazy refill, so a new day's free credits are available
  // before the balance is judged.
  const summary = await getBillingSummary(userId);
  if (!summary) {
    return { ok: false, response: errorResponse('Account not found.', 401, plainText) };
  }

  if (cost > 0 && summary.totalCredits < cost) {
    return {
      ok: false,
      response: errorResponse(
        `You need ${cost} credit${cost === 1 ? '' : 's'} for this and have ${summary.totalCredits}. ` +
          'Your free credits refresh soon, or you can top up at /pricing.',
        402,
        plainText,
      ),
    };
  }

  return {
    ok: true,
    userId,
    spend: async (description: string) => {
      if (cost <= 0) return;
      await spendCredits(userId, cost, description);
    },
  };
}

/**
 * Deducts credits, taking the refreshing plan allowance first so purchased
 * credits (which never expire) are kept for last.
 *
 * The balance guard lives in the `where` clause, so two concurrent jobs cannot
 * both pass a read-then-write check and overdraw the account.
 */
export async function spendCredits(
  userId: string,
  amount: number,
  description: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planCredits: true, purchasedCredits: true },
  });
  if (!user) return false;

  const fromPlan = Math.min(user.planCredits, amount);
  const fromPurchased = amount - fromPlan;
  if (user.purchasedCredits < fromPurchased) return false;

  const updated = await prisma.user.updateMany({
    where: {
      id: userId,
      planCredits: { gte: fromPlan },
      purchasedCredits: { gte: fromPurchased },
    },
    data: {
      planCredits: { decrement: fromPlan },
      purchasedCredits: { decrement: fromPurchased },
    },
  });

  // Another request got there first and moved the balance — do not record a
  // spend that did not happen.
  if (updated.count !== 1) return false;

  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: -amount,
      kind: 'spend',
      bucket: fromPlan >= amount ? 'plan' : 'purchased',
      description,
    },
  });

  return true;
}

function errorResponse(message: string, status: number, plainText?: boolean) {
  return plainText
    ? new NextResponse(message, { status })
    : NextResponse.json({ ok: false, error: message }, { status });
}
