'use client';

import {
  Users, Download, Star, CreditCard, Coins, Activity,
  TrendingUp, Clock, AlertCircle, ArrowRight, Zap,
} from 'lucide-react';
import Link from 'next/link';
import {
  StatCard, PageHeader, BarChart, AdminPage, TableCard, SectionCard,
  Table, Th, Td, StatusBadge, EmptyState,
} from './AdminUI';

interface Props {
  stats: {
    totalUsers: number;
    newUsersToday: number;
    newUsersMonth: number;
    totalDownloads: number;
    downloadsToday: number;
    downloadsMonth: number;
    pendingReviews: number;
    totalReviews: number;
    activeSubscriptions: number;
    totalCreditsUsed: number;
    creditsUsedToday: number;
  };
  topTools: { tool: string; count: number }[];
  recentActivity: { id: string; tool: string; platform: string; createdAt: string; status: string }[];
  dailyDownloads: { label: string; value: number }[];
  usersByPlan: { plan: string; count: number }[];
  adminEmail: string;
}

export function AdminDashboard({ stats, topTools, recentActivity, dailyDownloads, usersByPlan, adminEmail }: Props) {
  const pendingActions = [
    stats.pendingReviews > 0 && {
      label: `${stats.pendingReviews} review${stats.pendingReviews !== 1 ? 's' : ''} awaiting moderation`,
      href: '/admin/reviews',
      icon: Star,
      color: 'text-amber-600 bg-amber-50',
    },
  ].filter(Boolean) as { label: string; href: string; icon: typeof Star; color: string }[];

  return (
    <AdminPage>
      <PageHeader
        title="Dashboard"
        description={`Welcome back. Signed in as ${adminEmail}`}
      />

      {/* Pending actions */}
      {pendingActions.length > 0 && (
        <div className="space-y-2 mb-6">
          {pendingActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl hover:bg-amber-50 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-[13px] text-amber-800 font-medium flex-1">{action.label}</p>
              <ArrowRight className="w-4 h-4 text-amber-500 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          sub={`+${stats.newUsersToday} today`}
          icon={Users}
          accent="purple"
        />
        <StatCard
          label="Total Downloads"
          value={stats.totalDownloads.toLocaleString()}
          sub={`${stats.downloadsToday.toLocaleString()} today`}
          icon={Download}
          accent="blue"
        />
        <StatCard
          label="Active Subscriptions"
          value={stats.activeSubscriptions.toLocaleString()}
          icon={CreditCard}
          accent="green"
        />
        <StatCard
          label="Credits Used"
          value={stats.totalCreditsUsed.toLocaleString()}
          sub={`${stats.creditsUsedToday.toLocaleString()} today`}
          icon={Coins}
          accent="amber"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="New Users (30d)"
          value={stats.newUsersMonth.toLocaleString()}
          icon={TrendingUp}
          accent="green"
        />
        <StatCard
          label="Downloads (30d)"
          value={stats.downloadsMonth.toLocaleString()}
          icon={Activity}
          accent="blue"
        />
        <StatCard
          label="Pending Reviews"
          value={stats.pendingReviews.toLocaleString()}
          sub={`${stats.totalReviews.toLocaleString()} total`}
          icon={Star}
          accent="rose"
        />
        <StatCard
          label="Downloads Today"
          value={stats.downloadsToday.toLocaleString()}
          icon={Zap}
          accent="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <BarChart data={dailyDownloads} title="Download Activity" subtitle="Last 7 days" />
        </div>

        <SectionCard
          title="Users by Plan"
          actions={
            <Link href="/admin/users" className="text-[11px] text-primary hover:underline font-medium">
              View all
            </Link>
          }
        >
          {usersByPlan.length === 0 ? (
            <EmptyState message="No users yet." />
          ) : (
            <div className="divide-y divide-border-light">
              {usersByPlan.map((r) => (
                <div key={r.plan} className="flex items-center justify-between px-5 py-3">
                  <StatusBadge status={r.plan} />
                  <span className="text-sm font-semibold text-text tabular-nums">{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Top Tools"
          actions={
            <Link href="/admin/tools" className="text-[11px] text-primary hover:underline font-medium">
              View all
            </Link>
          }
        >
          <Table>
            <thead>
              <tr>
                <Th className="w-10">#</Th>
                <Th>Tool</Th>
                <Th className="text-right">Uses</Th>
              </tr>
            </thead>
            <tbody>
              {topTools.length === 0 ? (
                <tr><td colSpan={3}><EmptyState message="No tool usage data yet." /></td></tr>
              ) : topTools.map((r, i) => (
                <tr key={r.tool} className="hover:bg-surface/40 transition-colors">
                  <Td className="text-text-subtle font-medium">{i + 1}</Td>
                  <Td className="font-medium">{r.tool}</Td>
                  <Td className="text-right text-text-muted tabular-nums">{r.count.toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </SectionCard>

        <SectionCard
          title="Recent Activity"
          actions={
            <Link href="/admin/usage" className="text-[11px] text-primary hover:underline font-medium">
              View all
            </Link>
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>Tool</Th>
                <Th>Platform</Th>
                <Th>Status</Th>
                <Th className="text-right">Time</Th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr><td colSpan={4}><EmptyState message="No recent activity." /></td></tr>
              ) : recentActivity.slice(0, 8).map((d) => (
                <tr key={d.id} className="hover:bg-surface/40 transition-colors">
                  <Td className="font-medium max-w-[140px] truncate">{d.tool}</Td>
                  <Td className="text-text-muted">{d.platform}</Td>
                  <Td><StatusBadge status={d.status} dot /></Td>
                  <Td className="text-right text-text-muted text-[12px] whitespace-nowrap tabular-nums">
                    {new Date(d.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </SectionCard>
      </div>
    </AdminPage>
  );
}
