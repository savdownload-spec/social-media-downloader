'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { AdminPage, EmptyState, ErrorState, PageHeader, SectionCard, Skeleton, Table, Td, Th } from '@/components/admin/AdminUI';
import { PlatformMark } from './PlatformMark';
import { SocialStatusBadge } from './SocialStatusBadge';
import { apiGet } from './api';
import { useSocialBootstrap } from './useBootstrap';
import type { LogsData } from './types';
import { formatDateTimeInTimeZone } from '@/lib/social/timezone';
import { getPlatform } from '@/lib/social/platforms';

export function SocialLogs() {
  const { data: bootstrap, error: bootstrapError } = useSocialBootstrap();
  const [data, setData] = useState<LogsData | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiGet<LogsData>(`/api/admin/social/logs?page=${targetPage}&pageSize=25`));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Logs are unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  if (bootstrapError || !bootstrap) {
    return <AdminPage><ErrorState message={bootstrapError ?? 'Loading…'} /></AdminPage>;
  }

  const tz = bootstrap.config.timezone;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Social Media"
        title="Publishing Logs"
        description="Every provider interaction and social action, with secrets scrubbed."
        actions={
          <button onClick={() => void load(page)} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SectionCard title="Publishing attempts" subtitle={`${data?.total ?? 0} recorded`} className="xl:col-span-2">
          {loading && !data ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-9" />)}</div>
          ) : error ? (
            <ErrorState message={error} onRetry={() => void load(page)} />
          ) : !data || data.attempts.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No attempts yet"
              message="When a scheduled post is processed, its real outcome is recorded here."
            />
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Platform</Th>
                    <Th>Post</Th>
                    <Th>Outcome</Th>
                    <Th>Detail</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.attempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <Td className="whitespace-nowrap text-text-muted">{formatDateTimeInTimeZone(attempt.startedAt, tz)}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-2">
                          <PlatformMark platform={attempt.platform} size="sm" />
                          {getPlatform(attempt.platform)?.short ?? attempt.platform}
                        </span>
                      </Td>
                      <Td className="max-w-[220px] truncate">{attempt.post?.title || attempt.post?.caption || 'Deleted post'}</Td>
                      <Td><SocialStatusBadge status={attempt.outcome} /></Td>
                      <Td className="max-w-[320px] truncate text-text-muted">
                        <span title={attempt.errorCode ?? undefined}>{attempt.message || attempt.errorCode || '—'}</span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="flex items-center justify-between px-5 py-3 border-t border-border-light text-[12px] text-text-muted">
                <span>Page {data.page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1 || loading}
                    className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-surface"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages || loading}
                    className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-surface"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard title="Admin actions" subtitle="Audit trail (social.*)">
          {!data ? (
            <div className="p-5"><Skeleton className="h-40" /></div>
          ) : data.audits.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No actions yet" message="Creating, scheduling and confirming posts is audited here." />
          ) : (
            <ul className="divide-y divide-border-light/60">
              {data.audits.map((entry) => (
                <li key={entry.id} className="px-5 py-3">
                  <p className="text-[12px] font-medium text-text">{entry.action.replace('social.', '')}</p>
                  <p className="text-[11px] text-text-muted truncate">
                    {entry.adminEmail} · {formatDateTimeInTimeZone(entry.createdAt, tz)}
                  </p>
                  {entry.targetId && <p className="text-[10px] text-text-subtle truncate">{entry.targetType}: {entry.targetId}</p>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </AdminPage>
  );
}
