'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { AdminPage, ErrorState, PageHeader, SectionCard, Skeleton } from '@/components/admin/AdminUI';
import { useSocialBootstrap } from './useBootstrap';
import { apiGet } from './api';
import { PlatformMark } from './PlatformMark';
import type { CalendarPost } from './types';
import {
  addDaysToDateKey,
  dateKeyInTimeZone,
  formatDateTimeInTimeZone,
  monthGrid,
  monthLabel,
  timeInTimeZone,
  weekKeysForDateKey,
  weekdayOfDateKey,
  zonedDateTimeToUtc,
} from '@/lib/social/timezone';
import { getPlatform } from '@/lib/social/platforms';

type View = 'month' | 'week' | 'day';

const WEEKDAYS = Array.from({ length: 7 }, (_, index) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(Date.UTC(2026, 10, 1 + index))),
);

function statusRing(status: string): string {
  if (status === 'PUBLISHED') return 'border-l-emerald-500';
  if (status === 'PARTIAL') return 'border-l-orange-500';
  if (status === 'FAILED') return 'border-l-rose-500';
  if (status === 'NEEDS_AUTHORIZATION') return 'border-l-purple-500';
  if (status === 'MANUAL_ACTION_REQUIRED') return 'border-l-cyan-500';
  if (status === 'SCHEDULED' || status === 'QUEUED' || status === 'PUBLISHING') return 'border-l-blue-500';
  return 'border-l-gray-300';
}

export function SocialCalendar() {
  const router = useRouter();
  const { data: bootstrap, error: bootstrapError } = useSocialBootstrap();
  const [view, setView] = useState<View>('month');
  const [anchor, setAnchor] = useState('');
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const tz = bootstrap?.config.timezone ?? 'UTC';

  useEffect(() => {
    if (bootstrap && !anchor) setAnchor(dateKeyInTimeZone(new Date(bootstrap.serverTime), tz));
  }, [bootstrap, anchor, tz]);

  const range = useMemo(() => {
    if (!anchor) return null;
    if (view === 'month') {
      const [year, month] = anchor.split('-').map(Number);
      const grid = monthGrid(year, month - 1);
      return { from: grid[0].key, to: addDaysToDateKey(grid[grid.length - 1].key, 1) };
    }
    if (view === 'week') {
      const keys = weekKeysForDateKey(anchor);
      return { from: keys[0], to: addDaysToDateKey(keys[6], 1) };
    }
    return { from: anchor, to: addDaysToDateKey(anchor, 1) };
  }, [anchor, view]);

  const load = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        from: zonedDateTimeToUtc(`${range.from}T00:00`, tz).toISOString(),
        to: zonedDateTimeToUtc(`${range.to}T00:00`, tz).toISOString(),
      });
      const data = await apiGet<{ posts: CalendarPost[] }>(`/api/admin/social/calendar?${query.toString()}`);
      setPosts(data.posts);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The calendar could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [range, tz]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      if (platformFilter && !post.variants.some((variant) => variant.platform === platformFilter)) return false;
      if (statusFilter && post.status !== statusFilter) return false;
      return true;
    });
  }, [posts, platformFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const post of filtered) {
      const stamp = post.scheduledAt ?? post.publishedAt;
      if (!stamp) continue;
      const key = dateKeyInTimeZone(new Date(stamp), tz);
      map.set(key, [...(map.get(key) ?? []), post]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.scheduledAt ?? a.publishedAt ?? '').localeCompare(b.scheduledAt ?? b.publishedAt ?? ''));
    }
    return map;
  }, [filtered, tz]);

  function shift(direction: -1 | 1) {
    if (!anchor) return;
    if (view === 'month') {
      const [year, month] = anchor.split('-').map(Number);
      const next = new Date(Date.UTC(year, month - 1 + direction, 1));
      setAnchor(next.toISOString().slice(0, 7) + '-01');
    } else if (view === 'week') {
      setAnchor(addDaysToDateKey(anchor, 7 * direction));
    } else {
      setAnchor(addDaysToDateKey(anchor, direction));
    }
  }

  const todayKey = bootstrap ? dateKeyInTimeZone(new Date(bootstrap.serverTime), tz) : '';
  const monthParts = anchor ? anchor.split('-').map(Number) : null;
  const heading =
    view === 'month' && monthParts
      ? monthLabel(monthParts[0], monthParts[1] - 1)
      : view === 'week'
        ? `Week of ${anchor}`
        : anchor;

  if (bootstrapError) {
    return <AdminPage><ErrorState message={bootstrapError} /></AdminPage>;
  }
  if (!bootstrap) {
    return (
      <AdminPage>
        <Skeleton className="h-8 w-56 mb-6" />
        <Skeleton className="h-[520px]" />
      </AdminPage>
    );
  }

  function dayCell(key: string, day: number, options?: { inMonth?: boolean; tall?: boolean }) {
    const items = grouped.get(key) ?? [];
    const isToday = key === todayKey;
    return (
      <div
        key={key}
        className={`min-h-[96px] border border-border-light/70 rounded-lg p-1.5 bg-white ${options?.inMonth === false ? 'opacity-50' : ''} ${options?.tall ? 'min-h-[300px]' : ''}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className={`text-[11px] font-semibold ${isToday ? 'bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-text-muted'}`}>
            {options?.inMonth === false ? key.slice(8, 10) : day}
          </span>
          <button
            onClick={() => router.push(`/admin/social/compose?date=${key}`)}
            className="opacity-0 hover:opacity-100 focus:opacity-100 p-0.5 rounded text-text-subtle hover:text-primary"
            aria-label={`Create post on ${key}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-1">
          {items.slice(0, options?.tall ? 20 : 3).map((post) => {
            const stamp = post.scheduledAt ?? post.publishedAt;
            return (
              <button
                key={post.id}
                onClick={() => router.push(`/admin/social/compose?id=${post.id}`)}
                className={`w-full text-left border-l-2 pl-1.5 py-0.5 rounded-r hover:bg-surface/80 ${statusRing(post.status)}`}
                title={`${post.title || post.caption} · ${post.status}`}
              >
                <span className="flex items-center gap-1">
                  <span className="text-[10px] text-text-subtle">{stamp ? timeInTimeZone(new Date(stamp), tz) : '—'}</span>
                  <span className="flex -space-x-1">
                    {post.variants.slice(0, 3).map((variant) => (
                      <PlatformMark key={variant.platform} platform={variant.platform} size="xs" className="ring-1 ring-white" />
                    ))}
                  </span>
                </span>
                <span className="block text-[10px] text-text truncate">{post.title || post.caption || 'Untitled'}</span>
              </button>
            );
          })}
          {items.length > (options?.tall ? 20 : 3) && (
            <p className="text-[9px] text-text-subtle pl-1">+{items.length - (options?.tall ? 20 : 3)} more</p>
          )}
        </div>
      </div>
    );
  }

  const monthCells = view === 'month' && monthParts ? monthGrid(monthParts[0], monthParts[1] - 1) : [];

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Social Media"
        title="Content Calendar"
        description={`Times shown in ${tz}. Stored timestamps are UTC.`}
        actions={
          <>
            <button onClick={() => void load()} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button onClick={() => router.push('/admin/social/compose')} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl text-white bg-gradient-brand">
              <Plus className="w-4 h-4" /> Create post
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 rounded-xl bg-surface p-1">
          {(['month', 'week', 'day'] as View[]).map((entry) => (
            <button
              key={entry}
              onClick={() => setView(entry)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium capitalize ${view === entry ? 'bg-white text-text shadow-sm' : 'text-text-muted'}`}
            >
              {entry}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="p-1.5 rounded-lg border border-border hover:bg-surface" aria-label="Previous"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setAnchor(todayKey)} className="px-3 py-1.5 rounded-lg border border-border text-[12px] hover:bg-surface">Today</button>
          <button onClick={() => shift(1)} className="p-1.5 rounded-lg border border-border hover:bg-surface" aria-label="Next"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <h2 className="text-sm font-semibold text-text">{heading}</h2>
        <div className="ml-auto flex gap-2">
          <select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} className="rounded-lg border border-border px-2 py-1.5 text-[12px] bg-white" aria-label="Filter by platform">
            <option value="">All platforms</option>
            {bootstrap.platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.short}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-border px-2 py-1.5 text-[12px] bg-white" aria-label="Filter by status">
            <option value="">All statuses</option>
            {['DRAFT', 'SCHEDULED', 'QUEUED', 'PUBLISHED', 'PARTIAL', 'FAILED', 'NEEDS_AUTHORIZATION', 'MANUAL_ACTION_REQUIRED', 'CANCELLED'].map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading && posts.length === 0 ? (
        <Skeleton className="h-[520px]" />
      ) : (
        <SectionCard>
          <div className="p-3">
            {view === 'month' && (
              <>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAYS.map((day) => <div key={day} className="text-center text-[10px] font-semibold text-text-subtle uppercase">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthCells.map((cell) => dayCell(cell.key, cell.day, { inMonth: cell.inMonth }))}
                </div>
              </>
            )}
            {view === 'week' && (
              <div className="grid grid-cols-1 md:grid-cols-7 gap-1">
                {weekKeysForDateKey(anchor).map((key) => (
                  <div key={key}>
                    <div className="text-center text-[10px] font-semibold text-text-subtle uppercase mb-1">
                      {WEEKDAYS[weekdayOfDateKey(key)]} {key.slice(8, 10)}
                    </div>
                    {dayCell(key, Number(key.slice(8, 10)), { tall: true })}
                  </div>
                ))}
              </div>
            )}
            {view === 'day' && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[13px] font-semibold text-text">{anchor}</span>
                  <span className="text-[11px] text-text-muted">{(grouped.get(anchor) ?? []).length} post(s)</span>
                </div>
                {dayCell(anchor, Number(anchor.slice(8, 10)), { tall: true })}
              </div>
            )}
          </div>
        </SectionCard>
      )}

      <p className="mt-3 text-[11px] text-text-muted flex items-center gap-1.5">
        <CalendarDays className="w-3 h-3" /> Click a day to create a post, or a card to edit it. Drafts without a time are not shown on the calendar.
      </p>
      {filtered.length > 0 && (
        <p className="mt-1 text-[11px] text-text-muted">
          {filtered.length} post(s) in view{filtered[0]?.publishedAt ? ` · latest publication ${formatDateTimeInTimeZone(filtered[0].publishedAt, tz)}` : ''}.
        </p>
      )}
    </AdminPage>
  );
}
