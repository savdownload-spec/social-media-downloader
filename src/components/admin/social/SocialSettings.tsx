'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Check, Copy, KeyRound, Play, RefreshCw, Trash2, UserPlus } from 'lucide-react';
import { AdminPage, ErrorState, PageHeader, SectionCard, Skeleton } from '@/components/admin/AdminUI';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';
import { apiGet, apiSend } from './api';
import { can, useSocialBootstrap } from './useBootstrap';
import type { MemberDTO, SocialSettingsData } from './types';
import { PlatformMark } from './PlatformMark';

const COMMON_ZONES = [
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {label}
    </span>
  );
}

export function SocialSettings() {
  const { data: bootstrap, error: bootstrapError } = useSocialBootstrap();
  const [settings, setSettings] = useState<SocialSettingsData | null>(null);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<'EDITOR' | 'PUBLISHER'>('EDITOR');
  const [adding, setAdding] = useState(false);
  const { success, error: toastError, info } = useToast();
  const { confirm } = useConfirm();

  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [defaultHashtags, setDefaultHashtags] = useState('');
  const [defaultPlatforms, setDefaultPlatforms] = useState<string[]>([]);
  const [schedulerNote, setSchedulerNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsData, memberData] = await Promise.all([
        apiGet<SocialSettingsData>('/api/admin/social/settings'),
        apiGet<{ members: MemberDTO[] }>('/api/admin/social/members'),
      ]);
      setSettings(settingsData);
      setMembers(memberData.members);
      setTimezone(settingsData.config.timezone);
      setDefaultHashtags(settingsData.config.defaultHashtags);
      setDefaultPlatforms(settingsData.config.defaultPlatforms);
      setSchedulerNote(settingsData.config.schedulerNote);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Settings are unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      const data = await apiSend<{ config: SocialSettingsData['config'] }>('/api/admin/social/settings', 'PUT', {
        timezone,
        defaultHashtags,
        defaultPlatforms,
        schedulerNote,
      });
      setSettings((current) => (current ? { ...current, config: data.config } : current));
      success('Settings saved');
    } catch (cause) {
      toastError('Save failed', cause instanceof Error ? cause.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function runDue() {
    setRunning(true);
    try {
      const result = await apiSend<{ processed: number }>('/api/admin/social/jobs/run', 'POST');
      if (result.processed > 0) success('Worker finished', `${result.processed} job${result.processed === 1 ? '' : 's'} processed.`);
      else info('Nothing due');
    } catch (cause) {
      toastError('Worker failed', cause instanceof Error ? cause.message : undefined);
    } finally {
      setRunning(false);
    }
  }

  async function addMember() {
    if (!addEmail.trim()) return;
    setAdding(true);
    try {
      await apiSend('/api/admin/social/members', 'POST', { email: addEmail.trim(), role: addRole });
      success('Member saved', `${addEmail.trim()} can now access the Social Media Manager.`);
      setAddEmail('');
      await load();
    } catch (cause) {
      toastError('Could not add member', cause instanceof Error ? cause.message : undefined);
    } finally {
      setAdding(false);
    }
  }

  async function removeMember(member: MemberDTO) {
    const approved = await confirm({
      title: 'Remove this member?',
      description: `${member.user.email ?? member.userId} will lose access to the Social Media Manager.`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!approved) return;
    try {
      await apiSend(`/api/admin/social/members?userId=${encodeURIComponent(member.userId)}`, 'DELETE');
      success('Member removed');
      await load();
    } catch (cause) {
      toastError('Remove failed', cause instanceof Error ? cause.message : undefined);
    }
  }

  async function copyEndpoint(endpoint: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${endpoint}`);
      success('Endpoint copied');
    } catch {
      toastError('Copy failed');
    }
  }

  if (bootstrapError || (!bootstrap && !error)) {
    return <AdminPage><ErrorState message={bootstrapError ?? 'Loading…'} /></AdminPage>;
  }
  if (error) {
    return <AdminPage><ErrorState message={error} onRetry={() => void load()} /></AdminPage>;
  }
  if (!bootstrap || !settings || loading) {
    return (
      <AdminPage>
        <Skeleton className="h-8 w-56 mb-6" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </AdminPage>
    );
  }

  const canPublish = can(bootstrap.actor.capabilities, 'publish');
  const endpoint = `${settings.scheduler.endpoint}`;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Social Media"
        title="Automation Settings"
        description="Time zone, defaults, scheduler access, and who may work on social posts."
        actions={
          <Button onClick={save} loading={saving}>
            {!saving && <Check className="w-4 h-4" />} Save settings
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SectionCard title="Publishing defaults" subtitle="Applied to new posts">
          <div className="p-5 space-y-4">
            <label className="block">
              <span className="text-[12px] font-semibold text-text">Default time zone</span>
              <input
                list="social-timezones"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <datalist id="social-timezones">
                {COMMON_ZONES.map((zone) => <option key={zone} value={zone} />)}
              </datalist>
              <span className="text-[11px] text-text-muted">Stored timestamps are UTC; this controls how they are displayed and entered.</span>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-text">Default hashtags</span>
              <textarea
                value={defaultHashtags}
                onChange={(event) => setDefaultHashtags(event.target.value)}
                rows={2}
                placeholder="#GetSavDown #MediaTools"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>

            <div>
              <span className="text-[12px] font-semibold text-text">Default platforms</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {bootstrap.platforms.map((platform) => {
                  const selected = defaultPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() =>
                        setDefaultPlatforms((current) =>
                          current.includes(platform.id)
                            ? current.filter((entry) => entry !== platform.id)
                            : [...current, platform.id],
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        selected ? 'border-primary/40 bg-primary/[0.06] text-primary' : 'border-border text-text-muted hover:bg-surface'
                      }`}
                      aria-pressed={selected}
                    >
                      <PlatformMark platform={platform.id} size="xs" />
                      {platform.short}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="block">
              <span className="text-[12px] font-semibold text-text">Internal scheduler note</span>
              <input
                value={schedulerNote}
                onChange={(event) => setSchedulerNote(event.target.value)}
                placeholder="e.g. pinger checks every 5 minutes"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard title="Scheduling & infrastructure" subtitle="Free-tier trigger configuration">
          <div className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Flag ok={settings.flags.cronConfigured} label={settings.flags.cronConfigured ? 'CRON_SECRET set' : 'CRON_SECRET missing'} />
              <Flag ok={settings.flags.tokenEncryptionReady} label={settings.flags.tokenEncryptionReady ? 'Token encryption ready' : 'Encryption key missing'} />
              <Flag ok={settings.flags.blobConfigured} label={settings.flags.blobConfigured ? 'Blob storage connected' : 'Local media only'} />
            </div>

            <div className="rounded-lg border border-border-light bg-surface/50 p-3">
              <p className="text-[12px] font-semibold text-text flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> Worker endpoint
              </p>
              <div className="mt-1 flex items-center gap-2">
                <code className="text-[11px] text-text-muted truncate">{endpoint}</code>
                <button
                  onClick={() => void copyEndpoint(endpoint)}
                  className="text-text-subtle hover:text-primary"
                  aria-label="Copy worker endpoint"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-text-muted leading-relaxed">
                Daily Vercel cron: <code>{settings.scheduler.dailyCron}</code>. For sub-daily publishing, have a free scheduler
                call this endpoint every few minutes with <code>Authorization: Bearer $CRON_SECRET</code>. {settings.scheduler.note}
              </p>
            </div>

            {canPublish && (
              <Button variant="outline" size="sm" onClick={runDue} loading={running}>
                {!running && <Play className="w-3.5 h-3.5" />} Run due now
              </Button>
            )}

            <p className="text-[11px] text-text-muted flex items-start gap-1.5">
              <KeyRound className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Secrets are never displayed. Set SOCIAL_TOKEN_ENCRYPTION_KEY and CRON_SECRET in Vercel environment variables.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Module members" subtitle="Editors draft; publishers approve and publish" className="xl:col-span-2">
          <div className="p-5">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input
                type="email"
                value={addEmail}
                onChange={(event) => setAddEmail(event.target.value)}
                placeholder="person@getsavdown.com"
                className="flex-1 rounded-lg border border-border px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Member email"
              />
              <select
                value={addRole}
                onChange={(event) => setAddRole(event.target.value as 'EDITOR' | 'PUBLISHER')}
                className="rounded-lg border border-border px-3 py-2 text-[13px] bg-white"
                aria-label="Member role"
              >
                <option value="EDITOR">Editor</option>
                <option value="PUBLISHER">Publisher</option>
              </select>
              <Button onClick={addMember} loading={adding} disabled={!addEmail.trim()}>
                {!adding && <UserPlus className="w-4 h-4" />} Add member
              </Button>
            </div>

            <p className="text-[11px] text-text-muted mb-3">
              The person must have signed in to GetSavDown at least once. Administrators always have Super Admin access and
              do not need to be added here.
            </p>

            {members.length === 0 ? (
              <div className="rounded-lg bg-surface/60 px-4 py-6 text-center text-[12px] text-text-muted">
                No module members yet. Only administrators can access this module.
              </div>
            ) : (
              <ul className="divide-y divide-border-light/60">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-text truncate">{member.user.name || member.user.email}</p>
                      <p className="text-[11px] text-text-muted truncate">{member.user.email}</p>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-primary/[0.07] text-primary">
                      {member.role === 'PUBLISHER' ? 'Publisher' : 'Editor'}
                    </span>
                    <button
                      onClick={() => void removeMember(member)}
                      className="p-1.5 rounded-lg text-text-subtle hover:text-rose-600 hover:bg-rose-50"
                      aria-label={`Remove ${member.user.email ?? 'member'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SectionCard>
      </div>

      <p className="mt-4 text-[11px] text-text-muted flex items-center gap-1.5">
        <RefreshCw className="w-3 h-3" /> Phase 1: manual publishing everywhere, scheduled queue active, OAuth integrations next.
      </p>
    </AdminPage>
  );
}
