'use client';

import { cn } from '@/lib/utils';
import { statusLabel } from '@/lib/social/status';

const STYLES: Record<string, string> = {
  DRAFT: 'bg-surface text-text-muted',
  SCHEDULED: 'bg-blue-50 text-blue-700',
  QUEUED: 'bg-indigo-50 text-indigo-700',
  PUBLISHING: 'bg-amber-50 text-amber-700',
  PUBLISHED: 'bg-emerald-50 text-emerald-700',
  PARTIAL: 'bg-orange-50 text-orange-700',
  FAILED: 'bg-rose-50 text-rose-700',
  NEEDS_AUTHORIZATION: 'bg-purple-50 text-purple-700',
  MANUAL_ACTION_REQUIRED: 'bg-cyan-50 text-cyan-700',
  CANCELLED: 'bg-surface text-text-subtle',
  CONNECTED: 'bg-emerald-50 text-emerald-700',
  EXPIRING: 'bg-amber-50 text-amber-700',
  EXPIRED: 'bg-rose-50 text-rose-700',
  REVOKED: 'bg-surface text-text-muted',
  ERROR: 'bg-rose-50 text-rose-700',
  SUCCESS: 'bg-emerald-50 text-emerald-700',
  MANUAL: 'bg-cyan-50 text-cyan-700',
  SKIPPED: 'bg-purple-50 text-purple-700',
  UNKNOWN: 'bg-amber-50 text-amber-700',
};

const DOTS: Record<string, string> = {
  PUBLISHED: 'bg-emerald-500',
  CONNECTED: 'bg-emerald-500',
  SUCCESS: 'bg-emerald-500',
  SCHEDULED: 'bg-blue-500',
  QUEUED: 'bg-indigo-500',
  PUBLISHING: 'bg-amber-500',
  EXPIRING: 'bg-amber-500',
  PARTIAL: 'bg-orange-500',
  FAILED: 'bg-rose-500',
  EXPIRED: 'bg-rose-500',
  ERROR: 'bg-rose-500',
  NEEDS_AUTHORIZATION: 'bg-purple-500',
  MANUAL_ACTION_REQUIRED: 'bg-cyan-500',
};

export function SocialStatusBadge({ status, dot = true }: { status: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap',
        STYLES[status] ?? 'bg-surface text-text-muted',
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOTS[status] ?? 'bg-gray-400')} />}
      {statusLabel(status)}
    </span>
  );
}
