'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyRound, Link2, LoaderCircle, Settings2, ShieldCheck, ShieldAlert, Unplug } from 'lucide-react';
import { AdminPage, EmptyState, ErrorState, PageHeader, SectionCard, Skeleton } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { PlatformMark } from './PlatformMark';
import { SocialStatusBadge } from './SocialStatusBadge';
import { apiGet, apiSend } from './api';
import { can, useSocialBootstrap } from './useBootstrap';
import type { AccountDTO, ProviderDTO } from './types';
import type { PlatformDefinition, PlatformId } from '@/lib/social/platforms';
import { formatDateTimeInTimeZone } from '@/lib/social/timezone';

type AccountsPayload = {
  accounts: AccountDTO[];
  platforms: PlatformDefinition[];
  providers: ProviderDTO[];
  callbackOrigin: string;
};

const OAUTH_SLUG: Partial<Record<PlatformId, string>> = {
  FACEBOOK: 'meta',
  INSTAGRAM: 'meta',
  LINKEDIN: 'linkedin',
  PINTEREST: 'pinterest',
};

const CONNECT_LABEL: Record<ProviderDTO['mode'], string> = {
  oauth: 'Connect with OAuth',
  credentials: 'Add credentials',
  approval: 'Approval required',
};

function phaseLabel(platform: PlatformDefinition): { text: string; tone: string } {
  if (!platform.autoPublish) {
    return { text: 'Manual workflow', tone: 'bg-cyan-50 text-cyan-700' };
  }
  if (platform.automatedPhase === 3) {
    return { text: 'Provider approval required', tone: 'bg-amber-50 text-amber-700' };
  }
  return { text: 'Automated API', tone: 'bg-emerald-50 text-emerald-700' };
}

function boardCount(metadata: unknown): number {
  const boards = (metadata as { boards?: unknown } | null)?.boards;
  return Array.isArray(boards) ? boards.length : 0;
}

export function SocialAccounts() {
  const { data: bootstrap, error: bootstrapError, loading: bootstrapLoading, reload } = useSocialBootstrap();
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [platforms, setPlatforms] = useState<PlatformDefinition[]>([]);
  const [providers, setProviders] = useState<ProviderDTO[]>([]);
  const [callbackOrigin, setCallbackOrigin] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState<string | null>(null);
  const [credentialPlatform, setCredentialPlatform] = useState<'BLUESKY' | 'MASTODON' | null>(null);
  const [credentialForm, setCredentialForm] = useState({
    handle: '',
    appPassword: '',
    pds: '',
    instance: '',
    accessToken: '',
  });
  const [connecting, setConnecting] = useState(false);
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiGet<AccountsPayload>('/api/admin/social/accounts');
      setAccounts(data.accounts);
      setPlatforms(data.platforms);
      setProviders(data.providers ?? []);
      setCallbackOrigin(data.callbackOrigin ?? '');
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Accounts could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The OAuth callback redirects back with ?connected= / ?error=.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const failure = params.get('error');
    if (!connected && !failure) return;
    if (connected) success('Connected', connected);
    if (failure) toastError('Connection failed', failure);
    params.delete('connected');
    params.delete('error');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [success, toastError]);

  const byPlatform = useMemo(() => {
    const map = new Map<string, AccountDTO[]>();
    for (const account of accounts) {
      map.set(account.platform, [...(map.get(account.platform) ?? []), account]);
    }
    return map;
  }, [accounts]);

  const providerByPlatform = useMemo(() => {
    const map = new Map<string, ProviderDTO>();
    for (const provider of providers) map.set(provider.platform, provider);
    return map;
  }, [providers]);

  function startConnect(platform: PlatformId) {
    const provider = providerByPlatform.get(platform);
    if (!provider) return;
    if (provider.mode === 'approval') {
      toastError('Not available yet', provider.instructions[0] ?? 'This provider needs approval first.');
      return;
    }
    if (provider.mode === 'credentials') {
      setCredentialForm({ handle: '', appPassword: '', pds: '', instance: '', accessToken: '' });
      setCredentialPlatform(platform as 'BLUESKY' | 'MASTODON');
      return;
    }
    if (!provider.configured) {
      toastError(
        `${provider.label} is not configured`,
        `Add ${provider.env.join(' and ')} to this environment, then try again.`,
      );
      return;
    }
    const slug = OAUTH_SLUG[platform];
    if (!slug) return;
    window.location.assign(`/api/admin/social/oauth/${slug}/start`);
  }

  async function submitCredentials() {
    if (!credentialPlatform) return;
    setConnecting(true);
    try {
      await apiSend('/api/admin/social/accounts/connect', 'POST',
        credentialPlatform === 'BLUESKY'
          ? {
              platform: 'BLUESKY',
              handle: credentialForm.handle.trim(),
              appPassword: credentialForm.appPassword.trim(),
              pds: credentialForm.pds.trim() || null,
            }
          : {
              platform: 'MASTODON',
              instance: credentialForm.instance.trim(),
              accessToken: credentialForm.accessToken.trim(),
            },
      );
      success('Account connected', 'Publishing will use this connection.');
      setCredentialPlatform(null);
      await load();
    } catch (cause) {
      toastError('Connection failed', cause instanceof Error ? cause.message : undefined);
    } finally {
      setConnecting(false);
    }
  }

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
  const credentialProvider = credentialPlatform ? providerByPlatform.get(credentialPlatform) : null;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Social Media"
        title="Social Accounts"
        description="Connect official accounts so scheduled posts publish through each platform's own API."
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
            Disconnecting removes the stored credentials and revokes the session where the provider supports it.
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
            const provider = providerByPlatform.get(platform.id);
            const setupVisible = setupOpen === platform.id;
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
                          {account.platform === 'PINTEREST' && (
                            <p className="text-[11px] text-text-subtle mt-0.5">
                              {boardCount(account.metadata)} board{boardCount(account.metadata) === 1 ? '' : 's'} available
                            </p>
                          )}
                          {account.lastError && (
                            <p className="text-[11px] text-rose-600 mt-1">{account.lastError}</p>
                          )}
                          {canManage && (
                            <div className="mt-2 flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-rose-600"
                                onClick={() => void disconnect(account)}
                                loading={busyId === account.id}
                              >
                                {busyId !== account.id && <Unplug className="w-3.5 h-3.5" />}
                                Disconnect
                              </Button>
                              {provider?.mode !== 'approval' && (account.status === 'EXPIRING' || account.status === 'EXPIRED' || account.status === 'ERROR') && (
                                <Button variant="ghost" size="sm" onClick={() => startConnect(platform.id)}>
                                  Reconnect
                                </Button>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-4 rounded-lg bg-surface/70 px-3 py-2 text-[11px] text-text-muted">
                      {platform.autoPublish
                        ? 'Not connected. Automated publishing stays off until an account is connected.'
                        : 'No connection required — use the manual publishing workflow from any post.'}
                    </div>
                  )}

                  {platform.autoPublish && canManage && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-text-subtle">
                          <KeyRound className="w-3.5 h-3.5" /> {provider?.label ?? 'Connection'}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startConnect(platform.id)}
                          disabled={provider?.mode === 'approval'}
                          title={provider?.mode === 'approval' ? provider.instructions[0] : undefined}
                        >
                          {provider ? CONNECT_LABEL[provider.mode] : 'Connect'}
                        </Button>
                      </div>
                      {provider && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] text-text-subtle hover:text-text"
                          onClick={() => setSetupOpen(setupVisible ? null : platform.id)}
                        >
                          <Settings2 className="w-3.5 h-3.5" /> {setupVisible ? 'Hide setup' : 'Setup instructions'}
                        </button>
                      )}
                      {provider && setupVisible && (
                        <div className="rounded-lg border border-border-light bg-surface/50 p-3 text-[11px] text-text-muted space-y-1.5">
                          <p className="font-medium text-text">How to enable</p>
                          <ol className="list-decimal pl-4 space-y-1">
                            {provider.instructions.map((line) => <li key={line}>{line}</li>)}
                          </ol>
                          {provider.env.length > 0 && (
                            <p>
                              <span className="font-medium text-text">Environment variables:</span>{' '}
                              <code>{provider.env.join(', ')}</code>{' '}
                              {provider.configured ? '— configured' : '— missing on this deployment'}
                            </p>
                          )}
                          {provider.callbackPath && (
                            <p className="break-all">
                              <span className="font-medium text-text">Redirect URI:</span>{' '}
                              <code>{callbackOrigin}{provider.callbackPath}</code>
                            </p>
                          )}
                        </div>
                      )}
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
            message="Connect a free API account to schedule posts automatically, or use the manual workflow from any post."
          />
        </div>
      )}

      <Modal
        open={credentialPlatform !== null}
        onClose={() => { if (!connecting) setCredentialPlatform(null); }}
        title={credentialProvider ? `Connect ${credentialPlatform === 'BLUESKY' ? 'Bluesky' : 'Mastodon'}` : 'Connect account'}
        description={credentialProvider?.instructions.join(' ')}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCredentialPlatform(null)} disabled={connecting}>Cancel</Button>
            <Button onClick={() => void submitCredentials()} loading={connecting}>Connect</Button>
          </div>
        }
      >
        {credentialPlatform === 'BLUESKY' ? (
          <div className="space-y-3">
            <label className="block text-[12px] font-medium text-text">
              Handle or DID
              <Input
                value={credentialForm.handle}
                onChange={(event) => setCredentialForm((prev) => ({ ...prev, handle: event.target.value }))}
                placeholder="you.bsky.social"
                autoComplete="username"
                className="mt-1"
              />
            </label>
            <label className="block text-[12px] font-medium text-text">
              App Password
              <Input
                type="password"
                value={credentialForm.appPassword}
                onChange={(event) => setCredentialForm((prev) => ({ ...prev, appPassword: event.target.value }))}
                placeholder="xxxx-xxxx-xxxx-xxxx"
                autoComplete="off"
                className="mt-1"
              />
            </label>
            <label className="block text-[12px] font-medium text-text">
              Custom PDS (optional)
              <Input
                value={credentialForm.pds}
                onChange={(event) => setCredentialForm((prev) => ({ ...prev, pds: event.target.value }))}
                placeholder="https://bsky.social"
                className="mt-1"
              />
            </label>
            <p className="text-[11px] text-text-subtle">The App Password is exchanged for a session and is not stored.</p>
          </div>
        ) : credentialPlatform === 'MASTODON' ? (
          <div className="space-y-3">
            <label className="block text-[12px] font-medium text-text">
              Instance URL
              <Input
                value={credentialForm.instance}
                onChange={(event) => setCredentialForm((prev) => ({ ...prev, instance: event.target.value }))}
                placeholder="https://mastodon.social"
                className="mt-1"
              />
            </label>
            <label className="block text-[12px] font-medium text-text">
              Access Token
              <Input
                type="password"
                value={credentialForm.accessToken}
                onChange={(event) => setCredentialForm((prev) => ({ ...prev, accessToken: event.target.value }))}
                placeholder="Paste the token from Preferences → Development"
                autoComplete="off"
                className="mt-1"
              />
            </label>
            <p className="text-[11px] text-text-subtle">Tokens are encrypted at rest and can be revoked in your instance.</p>
          </div>
        ) : null}
      </Modal>
    </AdminPage>
  );
}
