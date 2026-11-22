'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Link2, LoaderCircle, ShieldCheck, ShieldAlert, Unplug } from 'lucide-react';
import { AdminPage, EmptyState, ErrorState, PageHeader, SectionCard, Skeleton } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { PlatformMark } from './PlatformMark';
import { SocialStatusBadge } from './SocialStatusBadge';
import { apiGet, apiSend } from './api';
import { can, useSocialBootstrap } from './useBootstrap';
import type { AccountDTO } from './types';
import type { PlatformDefinition } from '@/lib/social/platforms';
import { formatDateTimeInTimeZone } from '@/lib/social/timezone';

function phaseLabel(platform: PlatformDefinition): { text: string; tone: string } {
  if (!platform.autoPublish) {
    return { text: 'Manual workflow', tone: 'bg-cyan-50 text-cyan-700' };
  }
  if (platform.automatedPhase === 2) return { text: 'OAuth opens in Phase 2', tone: 'bg-blue-50 text-blue-700' };
  if (platform.automatedPhase === 3) return { text: 'Provider review required (Phase 3)', tone: 'bg-amber-50 text-amber-700' };
  return { text: 'Automated', tone: 'bg-emerald-50 text-emerald-700' };
}

export function SocialAccounts() {
  const { data: bootstrap, error: bootstrapError, loading: bootstrapLoading, reload } = useSocialBootstrap();
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiGet<{ accounts: AccountDTO[]; platforms: PlatformDefinition[] }>('/api/admin/social/accounts');
      setAccounts(data.accounts);
      setPlatforms(data.platforms);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Accounts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byPlatform = useMemo(() => {
    const map = new Map<string, AccountDTO[]>();
    for (const account of accounts) {
      map.set(account.platform, [...(map.get(account.platform) ?? []), account]);
    }
    return map;
  }, [accounts]);

  async function disconnect(account: AccountDTO) {
    const approved = await confirm({
      title: `Disconnect ${account.accountName}?`,
      description: 'Stored credentials for this account are removed. Published history is kept.',
      confirmLabel: 'Disconnect',
      variant: 'danger',
    });
    if (!approved) return;
    setBusyId(account.id);
    try {
      await apiSend(`/api/admin/social/accounts?id=${encodeURIComponent(account.id)}`, 'DELETE');
      success('Account disconnected');
      await load();
    } catch (cause) {
      toastError('Disconnect failed', cause instanceof Error ? cause.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  if (bootstrapLoading && !bootstrap) {
    return (
      <AdminPage>
        <Skeleton className="h-8 w-56 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40" />)}
        </div>
      </AdminPage>
    );
  }

  if (bootstrapError || !bootstrap) {
    return (
      <AdminPage>
        <ErrorState message={bootstrapError ?? 'Accounts are unavailable.'} onRetry={() => void reload()} />
      </AdminPage>
    );
  }

  const tz = bootstrap.config.timezone;
  const canManage = can(bootstrap.actor.capabilities, 'accounts');

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Social Media"
        title="Social Accounts"
        description="Connect official accounts for automated publishing. Manual-only platforms need no connection."
      />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-border-light bg-white px-4 py-3">
        {bootstrap.flags.tokenEncryptionReady ? (
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        )}
        <div className="text-[12px] text-text-muted leading-relaxed">
          <p className="font-semibold text-text">Credential safety</p>
          <p>
            Access tokens are encrypted with AES-256-GCM at rest and never sent to the browser. Token encryption is{' '}
            {bootstrap.flags.tokenEncryptionReady ? 'configured' : 'not configured yet — add SOCIAL_TOKEN_ENCRYPTION_KEY before connecting accounts'}.
            OAuth connections for Meta, LinkedIn, Bluesky and Mastodon land in Phase 2.
          </p>
        </div>
      </div>

      {loadError ? (
        <ErrorState message={loadError} onRetry={() => void load()} />
      ) : loading && platforms.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const linked = byPlatform.get(platform.id) ?? [];
            const phase = phaseLabel(platform);
            return (
              <SectionCard key={platform.id} className="h-full">
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <PlatformMark platform={platform.id} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text">{platform.label}</p>
                      <p className="text-[11px] text-text-muted">{platform.accountType}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${phase.tone}`}>{phase.text}</span>
                  </div>

                  <p className="mt-3 text-[12px] text-text-muted leading-relaxed">{platform.providerNotes}</p>

                  {linked.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {linked.map((account) => (
                        <li key={account.id} className="rounded-lg border border-border-light px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Link2 className="w-3.5 h-3.5 text-text-subtle" />
                            <span className="text-[12px] font-medium text-text truncate">{account.accountName}</span>
                            <span className="ml-auto"><SocialStatusBadge status={account.status} /></span>
                          </div>
                          <p className="text-[11px] text-text-muted mt-1">
                            {account.username ? `@${account.username} · ` : ''}
                            {account.tokenExpiresAt
                              ? `token expires ${formatDateTimeInTimeZone(account.tokenExpiresAt, tz)}`
                              : 'no token expiry recorded'}
                          </p>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 text-rose-600"
                              onClick={() => void disconnect(account)}
                              loading={busyId === account.id}
                            >
                              {busyId !== account.id && <Unplug className="w-3.5 h-3.5" />}
                              Disconnect
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-4 rounded-lg bg-surface/70 px-3 py-2 text-[11px] text-text-muted">
                      {platform.autoPublish
                        ? 'Not connected. Automated publishing stays disabled until OAuth is enabled.'
                        : 'No connection required — use the manual publishing workflow from any post.'}
                    </div>
                  )}

                  {platform.autoPublish && (
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-text-subtle">
                        <KeyRound className="w-3.5 h-3.5" /> OAuth
                      </span>
                      <Button variant="outline" size="sm" disabled title="OAuth is enabled in Phase 2/3">
                        Connect
                      </Button>
                    </div>
                  )}
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}

      {!canManage && (
        <p className="mt-4 text-[11px] text-text-muted flex items-center gap-1.5">
          <LoaderCircle className="w-3 h-3" /> Account connection and removal require Super Admin access.
        </p>
      )}
      {accounts.length === 0 && !loading && (
        <div className="mt-6">
          <EmptyState
            icon={Link2}
            title="No accounts connected"
            message="Manual workflows work today for every platform. Automated connections are added in Phase 2."
          />
        </div>
      )}
    </AdminPage>
  );
}
