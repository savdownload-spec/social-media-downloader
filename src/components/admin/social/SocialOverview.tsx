'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Play,
  Plus,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { AdminPage, EmptyState, ErrorState, PageHeader, SectionCard, Skeleton, StatCard } from '@/components/admin/AdminUI';
import { SocialStatusBadge } from './SocialStatusBadge';
import { PlatformMark } from './PlatformMark';
import { apiGet, apiSend } from './api';
import { can, useSocialBootstrap } from './useBootstrap';
import type { Stats } from './types';
import { formatDateTimeInTimeZone } from '@/lib/social/timezone';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';

export function SocialOverview() {
  const { data: bootstrap, error: bootstrapError, loading: bootstrapLoading, reload } = useSocialBootstrap();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const { success, error: toastError, info } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setStatsError(null);
    try {
      setStats(await apiGet<Stats>('/api/admin/social/stats'));
    } catch (cause) {
      setStatsError(cause instanceof Error ? cause.message : 'Statistics are unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runDue() {
    setRunning(true);
    try {
      const result = await apiSend<{ processed: number }>('/api/admin/social/jobs/run', 'POST');
      if (result.processed > 0) success('Worker finished', `${result.processed} job${result.processed === 1 ? '' : 's'} processed.`);
      else info('Nothing due', 'No scheduled job was due just now.');
      await load();
    } catch (cause) {
      toastError('Worker failed', cause instanceof Error ? cause.message : undefined);
    } finally {
      setRunning(false);
    }
  }

  if (bootstrapLoading && !bootstrap) {
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
    return (
      <AdminPage>
        <ErrorState message={bootstrapError ?? 'Social Media Manager is unavailable.'} onRetry={() => void reload()} />
      </AdminPage>
    );
  }

  const tz = bootstrap.config.timezone;
  const counts = stats?.counts ?? {};
  const attention =
    (counts.FAILED ?? 0) + (counts.NEEDS_AUTHORIZATION ?? 0) + (counts.MANUAL_ACTION_REQUIRED ?? 0) + (counts.PARTIAL ?? 0);
  const canPublish = can(bootstrap.actor.capabilities, 'publish');

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Social Media"
        title="Overview"
        description="Create once, tailor per platform, then publish or schedule from one place."
        actions={
          <>
            {canPublish && (
              <Button variant="outline" size="sm" onClick={runDue} loading={running}>
                {!running && <Play className="w-4 h-4" />}
                Run due now
              </Button>
            )}
            <Link
              href="/admin/social/compose"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white bg-gradient-brand shadow-glow-lg"
            >
              <Plus className="w-4 h-4" /> Create post
            </Link>
          </>
        }
      />

      {attention > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-[13px] text-amber-900">
            <p className="font-semibold">{attention} variant{attention === 1 ? '' : 's'} need attention.</p>
            <p className="text-amber-800">
              Failed, unauthorized, or manual variants are listed on the{' '}
              <Link href="/admin/social/posts?tab=attention" className="underline font-medium">Posts → Needs attention</Link>{' '}
              tab. Nothing is marked published until a provider confirms it or you confirm the URL.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard label="Drafts" value={counts.DRAFT ?? 0} icon={FileText} accent="purple" sub="In preparation" />
        <StatCard
          label="Scheduled"
          value={(counts.SCHEDULED ?? 0) + (counts.QUEUED ?? 0) + (counts.PUBLISHING ?? 0)}
          icon={CalendarDays}
          accent="blue"
          sub="Queued for the worker"
        />
        <StatCard
          label="Published (30d)"
          value={stats?.publishedRecent ?? 0}
          icon={CheckCircle2}
          accent="green"
          sub={`${counts.PUBLISHED ?? 0} lifetime`}
        />
        <StatCard
          label="Needs attention"
          value={attention}
          icon={AlertTriangle}
          accent="amber"
          sub="Failed, manual, or unauthorized"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard
          title="Upcoming"
          subtitle="Next scheduled posts in your timezone"
          className="xl:col-span-2"
          actions={
            <Link href="/admin/social/calendar" className="text-[12px] font-medium text-primary hover:underline">
              Open calendar
            </Link>
          }
        >
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-12" />)}
            </div>
          ) : statsError ? (
            <ErrorState message={statsError} onRetry={() => void load()} />
          ) : !stats || stats.upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled"
              message="Schedule a post and it will appear here with the exact publish time."
              action={
                <Link href="/admin/social/compose" className="text-[13px] font-medium text-primary hover:underline">
                  Create a post
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border-light/60">
              {stats.upcoming.map((post) => (
                <li key={post.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex -space-x-1.5">
                    {post.platforms.slice(0, 4).map((variant) => (
                      <PlatformMark key={variant.platform} platform={variant.platform} size="sm" className="ring-2 ring-white" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/social/compose?id=${post.id}`} className="block text-[13px] font-medium text-text truncate hover:text-primary">
                      {post.title || post.caption || 'Untitled post'}
                    </Link>
                    <p className="text-[11px] text-text-muted">
                      {post.scheduledAt ? formatDateTimeInTimeZone(post.scheduledAt, tz) : 'No time set'} · {tz}
                    </p>
                  </div>
                  <SocialStatusBadge status={post.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Accounts" subtitle="Connected destinations">
          <div className="px-5 py-4">
            <p className="text-2xl font-bold text-text">{stats?.accounts.connected ?? 0}</p>
            <p className="text-[12px] text-text-muted mb-3">
              connected of {stats?.accounts.total ?? 0} saved account{stats?.accounts.total === 1 ? '' : 's'}
            </p>
            <Link href="/admin/social/accounts" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline">
              <Share2 className="w-3.5 h-3.5" /> Manage accounts
            </Link>
            <div className="mt-4 rounded-lg bg-surface/70 p-3 text-[11px] text-text-muted leading-relaxed">
              Phase 1 supports the full manual workflow. Meta, LinkedIn, Bluesky and Mastodon OAuth arrive in Phase 2.
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Recent activity"
          subtitle="Last publishing attempts"
          className="xl:col-span-3"
          actions={
            <button onClick={() => void load()} className="text-[12px] font-medium text-primary inline-flex items-center gap-1 hover:underline">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          }
        >
          {!stats ? (
            <div className="p-5"><Skeleton className="h-16" /></div>
          ) : stats.recentAttempts.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No publishing attempts yet"
              message="Publishing attempts are recorded with the real provider response — nothing is simulated."
            />
          ) : (
            <ul className="divide-y divide-border-light/60">
              {stats.recentAttempts.map((attempt) => (
                <li key={attempt.id} className="flex items-center gap-3 px-5 py-3">
                  <PlatformMark platform={attempt.platform} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-text truncate">
                      {attempt.post?.title || attempt.post?.caption || 'Deleted post'}
                    </p>
                    <p className="text-[11px] text-text-muted truncate">
                      {attempt.message || 'No message'} · {formatDateTimeInTimeZone(attempt.startedAt, tz)}
                    </p>
                  </div>
                  <SocialStatusBadge status={attempt.outcome} />
                </li>
              ))}
            </ul>
          )}
          {loading && !!stats && (
            <div className="px-5 py-1 text-[11px] text-text-subtle inline-flex items-center gap-1">
              <LoaderCircle className="w-3 h-3 animate-spin" /> Refreshing
            </div>
          )}
        </SectionCard>
      </div>
    </AdminPage>
  );
}
