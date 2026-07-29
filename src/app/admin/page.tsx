import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Container } from '@/components/layout/Container';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { buildMetadata } from '@/lib/seo';
import { Users, Download as DownloadIcon, Mail, TrendingUp } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Admin',
  description: 'Admin dashboard',
  path: '/admin',
  noIndex: true,
});

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session) redirect('/');
  if (role !== 'ADMIN') {
    return (
      <Container className="py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Access denied</h1>
        <p className="mt-4 text-text-muted">
          You need admin privileges to view this page.
        </p>
      </Container>
    );
  }

  const [totalDownloads, totalUsers, totalSubs, byTool, recentDownloads] = await Promise.all([
    prisma.download.count(),
    prisma.user.count(),
    prisma.newsletterSubscriber.count(),
    prisma.download.groupBy({
      by: ['tool'],
      _count: { tool: true },
      orderBy: { _count: { tool: 'desc' } },
      take: 10,
    }),
    prisma.download.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, tool: true, platform: true, createdAt: true, status: true },
    }),
  ]);

  const stats = [
    { label: 'Total downloads', value: totalDownloads.toLocaleString(), icon: DownloadIcon, tone: 'text-primary' },
    { label: 'Registered users', value: totalUsers.toLocaleString(), icon: Users, tone: 'text-accent-hover' },
    { label: 'Newsletter subscribers', value: totalSubs.toLocaleString(), icon: Mail, tone: 'text-text' },
    { label: 'Top tool', value: byTool[0]?.tool ?? '—', icon: TrendingUp, tone: 'text-primary' },
  ];

  return (
    <Container className="py-16">
      <p className="text-sm font-medium text-primary mb-3">Admin</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-3 text-text-muted">
        Signed in as {session.user?.email}
      </p>

      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="p-6 bg-white border border-border rounded-2xl shadow-soft">
            <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center mb-4">
              <s.icon className={`w-4 h-4 ${s.tone}`} />
            </div>
            <p className="text-sm text-text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-text tracking-tight">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-border rounded-2xl shadow-soft">
          <h2 className="font-semibold text-text mb-4">Top tools</h2>
          <div className="space-y-3">
            {byTool.length === 0 ? (
              <p className="text-sm text-text-muted">No downloads yet.</p>
            ) : (
              byTool.map((row) => (
                <div key={row.tool} className="flex items-center justify-between text-sm">
                  <span className="text-text">{row.tool}</span>
                  <span className="text-text-muted">{row._count.tool.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-6 bg-white border border-border rounded-2xl shadow-soft">
          <h2 className="font-semibold text-text mb-4">Recent activity</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentDownloads.length === 0 ? (
              <p className="text-sm text-text-muted">No activity yet.</p>
            ) : (
              recentDownloads.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1">
                  <div>
                    <p className="text-text">{d.tool}</p>
                    <p className="text-xs text-text-subtle">{d.platform}</p>
                  </div>
                  <span className="text-xs text-text-muted">
                    {new Date(d.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Container>
  );
}
