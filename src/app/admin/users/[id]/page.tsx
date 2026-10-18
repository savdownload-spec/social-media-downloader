import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildMetadata } from '@/lib/seo';
import { AdminUserDetail } from '@/components/admin/AdminUserDetail';

export const dynamic = 'force-dynamic';
export const metadata = buildMetadata({ title: 'User Detail — Admin', description: '', path: '/admin/users', noIndex: true });

export default async function AdminUserPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { role?: string } | undefined;
  if (admin?.role !== 'ADMIN') notFound();

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' } },
      creditLedger:  { orderBy: { createdAt: 'desc' }, take: 30 },
      downloads:     { orderBy: { createdAt: 'desc' }, take: 20 },
      reviews:       { orderBy: { createdAt: 'desc' }, take: 10 },
      payments:      { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!user) notFound();

  return (
    <AdminUserDetail
      user={{
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        emailVerified: user.emailVerified?.toISOString() ?? null,
        planCreditsResetAt: user.planCreditsResetAt?.toISOString() ?? null,
        stripeCustomerId: user.stripeCustomerId ?? null,
        subscriptions: user.subscriptions.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
          stripeSubscriptionId: s.stripeSubscriptionId,
          cancelAtPeriodEnd: s.cancelAtPeriodEnd,
          provider: s.provider,
          stripePriceId: s.stripePriceId,
          interval: s.interval,
        })),
        creditLedger: user.creditLedger.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
          planDelta: c.planDelta,
          purchasedDelta: c.purchasedDelta,
          balanceAfter: c.balanceAfter,
          planBalanceAfter: c.planBalanceAfter,
          purchasedBalanceAfter: c.purchasedBalanceAfter,
        })),
        downloads: user.downloads.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
          failureCode: d.failureCode ?? null,
          failureReason: d.failureReason ?? null,
        })),
        reviews: user.reviews.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          approvedAt: r.approvedAt?.toISOString() ?? null,
        })),
        payments: user.payments.map((p) => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          paidAt: p.paidAt?.toISOString() ?? null,
          refundedAt: p.refundedAt?.toISOString() ?? null,
        })),
      }}
    />
  );
}
