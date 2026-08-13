import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildMetadata } from '@/lib/seo';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export const metadata = buildMetadata({
  title: 'Admin Dashboard',
  description: 'SavDown admin dashboard',
  path: '/admin',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  const now = new Date();
  const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week     = new Date(today); week.setDate(week.getDate() - 7);
  const month    = new Date(today); month.setDate(month.getDate() - 30);

  const [
    totalUsers,
    newUsersToday,
    newUsersMonth,
    totalDownloads,
    downloadsToday,
    downloadsMonth,
    pendingReviews,
    totalReviews,
    activeSubscriptions,
    totalCreditsUsed,
    creditsUsedToday,
    topTools,
    recentActivity,
    dailyDownloads,
    usersByPlan,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { createdAt: { gte: month } } }),
    prisma.download.count(),
    prisma.download.count({ where: { createdAt: { gte: today } } }),
    prisma.download.count({ where: { createdAt: { gte: month } } }),
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.review.count(),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.creditTransaction.aggregate({ _sum: { amount: true }, where: { kind: 'spend' } }),
    prisma.creditTransaction.aggregate({ _sum: { amount: true }, where: { kind: 'spend', createdAt: { gte: today } } }),
    prisma.download.groupBy({
      by: ['tool'], _count: { tool: true },
      orderBy: { _count: { tool: 'desc' } }, take: 8,
    }),
    prisma.download.findMany({
      orderBy: { createdAt: 'desc' }, take: 15,
      select: { id: true, tool: true, platform: true, createdAt: true, status: true },
    }),
    // last 7 days of downloads for bar chart
    Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - (6 - i));
        const next = new Date(d); next.setDate(next.getDate() + 1);
        return prisma.download.count({ where: { createdAt: { gte: d, lt: next } } })
          .then((c) => ({ label: d.toLocaleDateString('en', { weekday: 'short' }), value: c }));
      })
    ),
    prisma.user.groupBy({ by: ['plan'], _count: { plan: true } }),
  ]);

  const stats = {
    totalUsers,
    newUsersToday,
    newUsersMonth,
    totalDownloads,
    downloadsToday,
    downloadsMonth,
    pendingReviews,
    totalReviews,
    activeSubscriptions,
    totalCreditsUsed: Math.abs(totalCreditsUsed._sum.amount ?? 0),
    creditsUsedToday: Math.abs(creditsUsedToday._sum.amount ?? 0),
  };

  return (
    <AdminDashboard
      stats={stats}
      topTools={topTools.map((r) => ({ tool: r.tool, count: r._count.tool }))}
      recentActivity={recentActivity.map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      }))}
      dailyDownloads={dailyDownloads}
      usersByPlan={usersByPlan.map((r) => ({ plan: r.plan, count: r._count.plan }))}
      adminEmail={session?.user?.email ?? ''}
    />
  );
}
