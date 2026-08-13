'use client';

import {
  Users, Download, Star, CreditCard, Coins, Activity,
  TrendingUp, Clock, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import {
  StatCard, PageHeader, BarChart, AdminPage, TableCard,
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
  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        description={`Signed in as ${adminEmail}`}
      />

      {/* Alert: pending reviews */}
      {stats.pendingReviews > 0 && (
        <Link href="/admin/reviews" className="flex items-center gap-3 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            {stats.pendingReviews} review{stats.pendingReviews !== 1 ? 's' : ''} awaiting moderation
          </p>
          <span className="ml-auto text-xs text-amber-600 font-semibold">Review →</span>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
          sub={`+${stats.newUsersToday} today · +${stats.newUsersMonth} this month`}
          icon={Users}
          accent="purple"
        />
        <StatCard
          label="Total Downloads"
          value={stats.totalDownloads.toLocaleString()}
          sub={`${stats.downloadsToday} today · ${stats.downloadsMonth} this month`}
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
          sub={`${stats.creditsUsedToday} today`}
          icon={Coins}
          accent="amber"
        />
        <StatCard
          label="Pending Reviews"
          value={stats.pendingReviews.toLocaleString()}
          sub={`${stats.totalReviews} total reviews`}
          icon={Star}
          accent="rose"
        />
        <StatCard
          label="New Users (30d)"
          value={stats.newUsersMonth.toLocaleString()}
          icon={TrendingUp}
          accent="green"
        />
        <StatCard
          label="Downloads Today"
          value={stats.downloadsToday.toLocaleString()}
          icon={Activity}
          accent="blue"
        />
        <StatCard
          label="Downloads (30d)"
          value={stats.downloadsMonth.toLocaleString()}
          icon={Clock}
          accent="purple"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <BarChart data={dailyDownloads} title="Downloads — last 7 days" />
        </div>

        {/* Users by plan */}
        <TableCard>
          <div className="p-4 border-b border-border">
            <p className="text-sm font-semibold text-text">Users by plan</p>
          </div>
          {usersByPlan.length === 0 ? (
            <EmptyState message="No users yet." />
          ) : (
            <div className="divide-y divide-border">
              {usersByPlan.map((r) => (
                <div key={r.plan} className="flex items-center justify-between px-4 py-3">
                  <StatusBadge status={r.plan} />
                  <span className="text-sm font-semibold text-text">{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </TableCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top tools */}
        <TableCard>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <p className="text-sm font-semibold text-text">Top tools</p>
            <Link href="/admin/tools" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Tool</Th>
                <Th className="text-right">Uses</Th>
              </tr>
            </thead>
            <tbody>
              {topTools.length === 0 ? (
                <tr><td colSpan={3}><EmptyState /></td></tr>
              ) : topTools.map((r, i) => (
                <tr key={r.tool} className="hover:bg-surface/50 transition-colors">
                  <Td className="text-text-muted w-10">{i + 1}</Td>
                  <Td className="font-medium">{r.tool}</Td>
                  <Td className="text-right text-text-muted">{r.count.toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableCard>

        {/* Recent activity */}
        <TableCard>
          <div className="flex items-center justify-between p-4 border-b border-border">
            <p className="text-sm font-semibold text-text">Recent activity</p>
            <Link href="/admin/usage" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Tool</Th>
                <Th>Platform</Th>
                <Th>Status</Th>
                <Th>Time</Th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length === 0 ? (
                <tr><td colSpan={4}><EmptyState /></td></tr>
              ) : recentActivity.map((d) => (
                <tr key={d.id} className="hover:bg-surface/50 transition-colors">
                  <Td className="font-medium max-w-[140px] truncate">{d.tool}</Td>
                  <Td className="text-text-muted">{d.platform}</Td>
                  <Td><StatusBadge status={d.status} /></Td>
                  <Td className="text-text-muted text-xs whitespace-nowrap">
                    {new Date(d.createdAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableCard>
      </div>
    </AdminPage>
  );
}
