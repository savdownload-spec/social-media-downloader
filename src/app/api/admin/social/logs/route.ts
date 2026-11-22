import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSocialApi, SOCIAL_NO_STORE_HEADERS } from '@/lib/social/api-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireSocialApi(request, 'view');
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(params.get('pageSize') ?? '25', 10) || 25));

  const [attempts, total, audits] = await Promise.all([
    prisma.publishingAttempt.findMany({
      orderBy: { startedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        variant: { select: { platform: true, post: { select: { id: true, title: true, caption: true } } } },
        account: { select: { accountName: true } },
        job: { select: { id: true } },
      },
    }),
    prisma.publishingAttempt.count(),
    prisma.auditLog.findMany({
      where: { action: { startsWith: 'social.' } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  return NextResponse.json(
    {
      ok: true,
      data: {
        attempts: attempts.map((attempt) => ({
          id: attempt.id,
          platform: attempt.platform,
          attemptNo: attempt.attemptNo,
          outcome: attempt.outcome,
          httpStatus: attempt.httpStatus,
          errorCode: attempt.errorCode,
          message: attempt.message,
          durationMs: attempt.durationMs,
          startedAt: attempt.startedAt.toISOString(),
          finishedAt: attempt.finishedAt?.toISOString() ?? null,
          accountName: attempt.account?.accountName ?? null,
          jobId: attempt.job?.id ?? null,
          post: attempt.variant?.post
            ? { id: attempt.variant.post.id, title: attempt.variant.post.title, caption: attempt.variant.post.caption }
            : null,
        })),
        total,
        page,
        pageSize,
        audits: audits.map((entry) => ({
          id: entry.id,
          action: entry.action,
          adminEmail: entry.adminEmail,
          targetType: entry.targetType,
          targetId: entry.targetId,
          detail: entry.detail,
          createdAt: entry.createdAt.toISOString(),
        })),
      },
    },
    { headers: SOCIAL_NO_STORE_HEADERS },
  );
}
