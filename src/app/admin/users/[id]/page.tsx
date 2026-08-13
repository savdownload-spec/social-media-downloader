import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildMetadata } from '@/lib/seo';
import { AdminUserDetail } from '@/components/admin/AdminUserDetail';

export const dynamic = 'force-dynamic';
export const metadata = buildMetadata({ title: 'User Detail — Admin', description: '', path: '/admin/users', noIndex: true });

export default async function AdminUserPage({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      subscriptions: { orderBy: { createdAt: 'desc' } },
      creditLedger:  { orderBy: { createdAt: 'desc' }, take: 30 },
      downloads:     { orderBy: { createdAt: 'desc' }, take: 20 },
      reviews:       { orderBy: { createdAt: 'desc' }, take: 10 },
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
        subscriptions: user.subscriptions.map((s) => ({ ...s, createdAt: s.createdAt.toISOString(), updatedAt: s.updatedAt.toISOString(), currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null })),
        creditLedger: user.creditLedger.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
        downloads: user.downloads.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })),
        reviews: user.reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(), approvedAt: r.approvedAt?.toISOString() ?? null })),
      }}
    />
  );
}
