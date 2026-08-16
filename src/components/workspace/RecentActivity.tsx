import Link from 'next/link';
import { DownloadCloud, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import type { ActivityItem } from '@/lib/workspace/activity';
import { formatDate } from '@/lib/utils';

function StatusBadge({ status }: { status: string }) {
  const ok = status === 'success';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        ok
          ? 'bg-accent-light text-accent-hover'
          : 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
      }`}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {ok ? 'Completed' : 'Failed'}
    </span>
  );
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center py-10 px-6 rounded-2xl border border-dashed border-border bg-white/60 dark:bg-card/60">
        <DownloadCloud className="w-6 h-6 text-text-subtle mx-auto mb-2.5" />
        <p className="text-sm font-medium text-text">No activity yet.</p>
        <p className="text-xs text-text-muted mt-1">Paste a link above to get started.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-border bg-white dark:bg-card shadow-soft overflow-hidden">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 px-4 py-3.5 border-b border-border-light last:border-0"
        >
          <span className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center shrink-0">
            <DownloadCloud className="w-4 h-4 text-text-subtle" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text truncate">{item.toolName}</p>
            <p className="text-xs text-text-muted truncate">{item.sourceUrl}</p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-text-subtle">{formatDate(item.createdAt)}</span>
            <StatusBadge status={item.status} />
            {item.toolHref && (
              <Link
                href={item.toolHref}
                className="w-7 h-7 rounded-lg hover:bg-surface flex items-center justify-center text-text-subtle hover:text-text transition-colors"
                title="Open tool"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      ))}
      <div className="px-4 py-3 bg-surface/50">
        <Link href="/workspace/activity" className="text-xs font-semibold text-primary hover:underline">
          View all activity →
        </Link>
      </div>
    </div>
  );
}
