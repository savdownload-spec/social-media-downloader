import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { claimDueJobs, claimJobById, releaseExpiredLeases } from './queue';
import { getPlatform } from './platforms';
import { adapters, type PublishContext, type PublishOutcome } from './adapters';
import { ATTENTION_STATUSES, derivePostStatus } from './status';
import { scrubSecrets } from './crypto';

export type JobRunSummary = {
  jobId: string;
  postId: string | null;
  postStatus: string | null;
  variantsProcessed: number;
};

/**
 * Process due publishing jobs. Safe to call concurrently: claiming uses
 * FOR UPDATE SKIP LOCKED, and every variant move is recorded as an attempt.
 * Returns honest per-job outcomes — nothing is marked published without a real
 * provider confirmation or an operator-confirmed manual URL.
 */
export async function processDueJobs(limit = 5): Promise<JobRunSummary[]> {
  await releaseExpiredLeases();
  const workerId = `social-${randomUUID().slice(0, 8)}`;
  const claimed = await claimDueJobs(limit, workerId);
  const results: JobRunSummary[] = [];

  for (const { id } of claimed) {
    try {
      results.push(await processJob(id));
    } catch (error) {
      console.error('Social publishing job failed', {
        jobId: id,
        error: error instanceof Error ? error.name : 'JobError',
      });
      await prisma.publishingJob
        .update({ where: { id }, data: { status: 'FAILED', lastError: 'Worker error', claimedBy: null, leaseUntil: null } })
        .catch(() => null);
      await prisma.socialPost
        .updateMany({ where: { jobs: { some: { id } } }, data: { status: 'FAILED' } })
        .catch(() => null);
      results.push({ jobId: id, postId: null, postStatus: 'FAILED', variantsProcessed: 0 });
    }
  }

  return results;
}

/**
 * Publish a specific post immediately. Claims only that job so a "Publish now"
 * click never delays behind other due jobs, then returns the real outcome.
 */
export async function processJobNow(jobId: string): Promise<JobRunSummary | null> {
  const workerId = `social-now-${randomUUID().slice(0, 8)}`;
  const claimed = await claimJobById(jobId, workerId);
  if (!claimed) return null;
  return processJob(jobId);
}

async function runVariant(context: PublishContext): Promise<PublishOutcome> {
  const def = getPlatform(context.variant.platform);
  if (!def) {
    return { outcome: 'FAILED', code: 'UNKNOWN_PLATFORM', message: 'Unsupported platform.' };
  }

  const adapter = adapters[def.id];
  if (adapter) {
    try {
      return await adapter(context);
    } catch {
      return {
        outcome: 'FAILED',
        code: 'ADAPTER_ERROR',
        message: 'The provider request failed. No success was recorded.',
      };
    }
  }

  if (def.autoPublish && !context.variant.accountId) {
    return {
      outcome: 'NEEDS_AUTH',
      code: 'ACCOUNT_REQUIRED',
      message: `No ${def.short} account is connected. Connect one, or use the manual workflow.`,
    };
  }
  if (def.autoPublish) {
    return {
      outcome: 'FAILED',
      code: 'ADAPTER_UNAVAILABLE',
      message: `Automated ${def.short} publishing is not enabled yet. Use the manual workflow.`,
    };
  }
  return {
    outcome: 'MANUAL',
    code: 'MANUAL_ONLY',
    message: `Prepare this ${def.short} post manually, publish it, then confirm the public URL.`,
  };
}

function variantStatusFor(outcome: PublishOutcome): string {
  if (outcome.outcome === 'PUBLISHED') return 'PUBLISHED';
  if (outcome.outcome === 'MANUAL') return 'MANUAL_ACTION_REQUIRED';
  if (outcome.outcome === 'NEEDS_AUTH') return 'NEEDS_AUTHORIZATION';
  return 'FAILED';
}

function attemptOutcomeFor(outcome: PublishOutcome): string {
  if (outcome.outcome === 'PUBLISHED') return 'SUCCESS';
  if (outcome.outcome === 'MANUAL') return 'MANUAL';
  if (outcome.outcome === 'NEEDS_AUTH') return 'SKIPPED';
  return 'FAILED';
}

async function processJob(jobId: string): Promise<JobRunSummary> {
  const job = await prisma.publishingJob.findUnique({
    where: { id: jobId },
    include: {
      post: {
        include: {
          variants: { include: { account: true } },
          media: { include: { asset: true }, orderBy: { position: 'asc' } },
        },
      },
    },
  });

  if (!job) return { jobId, postId: null, postStatus: null, variantsProcessed: 0 };
  if (job.status !== 'CLAIMED') {
    return { jobId, postId: job.postId, postStatus: job.post.status, variantsProcessed: 0 };
  }

  await prisma.socialPost.update({ where: { id: job.postId }, data: { status: 'PUBLISHING' } });

  const assets = job.post.media.map((entry) => entry.asset);
  const statuses: string[] = [];
  const publishedAccountIds = new Set<string>();
  let processed = 0;

  for (const variant of job.post.variants) {
    if (variant.status === 'CANCELLED' || variant.status === 'PUBLISHED') {
      statuses.push(variant.status);
      continue;
    }

    const startedAt = new Date();
    const outcome = await runVariant({
      post: job.post,
      variant,
      account: variant.account,
      assets,
    });
    const finishedAt = new Date();
    const published = outcome.outcome === 'PUBLISHED';
    const failure = outcome.outcome === 'PUBLISHED' ? null : { code: outcome.code ?? null, message: outcome.message };
    const nextStatus = variantStatusFor(outcome);

    await prisma.socialPostVariant.update({
      where: { id: variant.id },
      data: {
        status: nextStatus,
        attemptCount: { increment: 1 },
        lastAttemptAt: finishedAt,
        ...(published
          ? {
              remotePostId: outcome.remotePostId ?? variant.remotePostId,
              publishedUrl: outcome.publishedUrl ?? variant.publishedUrl,
              publishedAt: finishedAt,
              errorCode: null,
              errorMessage: null,
            }
          : {
              errorCode: failure?.code ?? null,
              errorMessage: failure?.message ?? null,
            }),
      },
    });

    if (published && variant.accountId) publishedAccountIds.add(variant.accountId);

    await prisma.publishingAttempt.create({
      data: {
        jobId: job.id,
        variantId: variant.id,
        accountId: variant.accountId,
        platform: variant.platform,
        attemptNo: variant.attemptCount + 1,
        outcome: attemptOutcomeFor(outcome),
        errorCode: published ? null : outcome.code ?? null,
        message: published ? 'Published' : scrubSecrets(outcome.message),
        providerResponse: outcome.providerResponse
          ? (scrubSecrets(outcome.providerResponse) as Prisma.InputJsonValue)
          : undefined,
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
      },
    });

    statuses.push(nextStatus);
    processed += 1;
  }

  const postStatus = derivePostStatus(statuses);
  const anyPublished = statuses.includes('PUBLISHED');
  const now = new Date();

  await prisma.socialPost.update({
    where: { id: job.postId },
    data: {
      status: postStatus,
      publishedAt: anyPublished ? job.post.publishedAt ?? now : job.post.publishedAt,
    },
  });

  if (publishedAccountIds.size > 0) {
    await prisma.socialAccount.updateMany({
      where: { id: { in: [...publishedAccountIds] } },
      data: { lastPublishedAt: now },
    });
  }

  await prisma.publishingJob.update({
    where: { id: job.id },
    data: { status: 'DONE', claimedBy: null, leaseUntil: null, attempts: { increment: 1 }, lastError: null },
  });

  if (ATTENTION_STATUSES.includes(postStatus)) {
    const subject = (job.post.title || job.post.caption || 'Social post').slice(0, 80);
    await prisma.adminNotification
      .create({
        data: {
          type: 'social.publish',
          section: 'social',
          entityType: 'SocialPost',
          entityId: job.postId,
          title: `Social post ${postStatus.replace(/_/g, ' ').toLowerCase()}`,
          message: `“${subject}” needs attention in the Social Media Manager.`,
          href: '/admin/social/posts?tab=attention',
          dedupeKey: `social-job-${job.id}`,
        },
      })
      .catch(() => null);
  }

  return { jobId: job.id, postId: job.postId, postStatus, variantsProcessed: processed };
}
