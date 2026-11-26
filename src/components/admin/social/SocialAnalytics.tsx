'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, CheckCircle2, MinusCircle, RefreshCw, Share2, TrendingUp } from 'lucide-react';
import { AdminPage, EmptyState, ErrorState, PageHeader, SectionCard, Skeleton, StatCard, Table, Td, Th } from '@/components/admin/AdminUI';
import { PlatformMark } from './PlatformMark';
import { SocialStatusBadge } from './SocialStatusBadge';
import { apiGet } from './api';
import { useSocialBootstrap } from './useBootstrap';
import type { Stats } from './types';
import { formatDateTimeInTimeZone } from '@/lib/social/timezone';
import { getPlatform } from '@/lib/social/platforms';

const UNAVAILABLE_METRICS = ['Likes', 'Comments', 'Shares', 'Impressions', 'Clicks', 'Follower changes'];

export function SocialAnalytics() {
  const { data: bootstrap, error: bootstrapError } = useSocialBootstrap();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await apiGet<Stats>('/api/admin/social/stats'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Analytics are unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!bootstrap && !bootstrapError) {
    return (
      <AdminPage>
        <Skeleton className="h-8 w-56 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28" />)}
        </div>
      </AdminPage>
    );
  }

  if (bootstrapError || !bootstrap) {
    return <AdminPage><ErrorState message={bootstrapError ?? 'Analytics are unavailable.'} /></AdminPage>;
  }

  const tz = bootstrap.config.timezone;
  const counts = stats?.counts ?? {};
  const publishedTotal = counts.PUBLISHED ?? 0;
  const maxPlatform = Math.max(1, ...(stats?.publishedByPlatform.map((entry) => entry.count) ?? [1]));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Social Media"
        title="Analytics"
        description="Publication counts from this system. Engagement metrics appear only when a provider supplies them."
        actions={
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Published (30d)" value={stats?.publishedRecent ?? 0} icon={TrendingUp} accent="green" sub="Post-level, rolled up" />
        <StatCard label="Published (all time)" value={publishedTotal} icon={CheckCircle2} accent="purple" sub="Variants marked published" />
        <StatCard label="Connected accounts" value={stats?.accounts.connected ?? 0} icon={Share2} accent="blue" sub={`${stats?.accounts.total ?? 0} saved`} />
        <StatCard
          label="Needs attention"
          value={(counts.FAILED ?? 0) + (counts.NEEDS_AUTHORIZATION ?? 0) + (counts.MANUAL_ACTION_REQUIRED ?? 0) + (counts.PARTIAL ?? 0)}
          icon={MinusCircle}
          accent="amber"
          sub="Nothing is auto-marked published"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard title="Published by platform" subtitle="Confirmed publications only" className="xl:col-span-2">
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-8" />)}</div>
          ) : error ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : !stats || stats.publishedByPlatform.length === 0 ? (
            <EmptyState icon={BarChart3} title="No confirmed publications yet" message="Counts appear after a provider confirms a post or you confirm a manual URL." />
          ) : (
            <div className="px-5 py-4 space-y-3">
              {stats.publishedByPlatform.map((entry) => (
                <div key={entry.platform} className="flex items-center gap-3">
                  <PlatformMark platform={entry.platform} size="sm" />
                  <span className="w-28 text-[12px] text-text-muted truncate">{getPlatform(entry.platform)?.short ?? entry.platform}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${Math.max(4, (entry.count / maxPlatform) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-[12px] font-semibold text-text">{entry.count}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Provider metrics" subtitle="No fabricated values">
          <div className="px-5 py-4">
            <p className="text-[12px] text-text-muted mb-3">
              These metrics require provider analytics APIs, which are enabled together with each platform integration.
            </p>
            <ul className="space-y-1.5">
              {UNAVAILABLE_METRICS.map((metric) => (
                <li key={metric} className="flex items-center justify-between text-[12px]">
                  <span className="text-text-muted">{metric}</span>
                  <span className="text-[11px] font-semibold text-text-subtle bg-surface rounded px-2 py-0.5">Unavailable</span>
                </li>
              ))}
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="Recent attempts" subtitle="Real worker outcomes" className="xl:col-span-3">
          {!stats || stats.recentAttempts.length === 0 ? (
            <EmptyState icon={BarChart3} title="No attempts recorded" message="Publishing attempts and their real outcomes will be listed here." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Platform</Th>
                  <Th>Post</Th>
                  <Th>Outcome</Th>
                  <Th>Message</Th>
                  <Th>When</Th>
                </tr>
              </thead>
              <tbody>
                {stats.recentAttempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <Td><span className="inline-flex items-center gap-2"><PlatformMark platform={attempt.platform} size="sm" />{getPlatform(attempt.platform)?.short ?? attempt.platform}</span></Td>
                    <Td className="max-w-[240px] truncate">{attempt.post?.title || attempt.post?.caption || 'Deleted post'}</Td>
                    <Td><SocialStatusBadge status={attempt.outcome} /></Td>
                    <Td className="max-w-[320px] truncate text-text-muted">{attempt.message || '—'}</Td>
                    <Td className="text-text-muted whitespace-nowrap">{formatDateTimeInTimeZone(attempt.startedAt, tz)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </SectionCard>
      </div>
    </AdminPage>
  );
}
