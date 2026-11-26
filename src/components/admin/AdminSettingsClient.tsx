'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminPage, PageHeader, SectionCard, ErrorState, Skeleton } from './AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Save, Settings, Coins, Star, Share2, Zap, LoaderCircle, Building2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

type Settings = Record<string, string>;

const SECTIONS = [
  {
    title: 'General',
    icon: Settings,
    keys: ['site_name', 'site_tagline', 'maintenance_mode'],
  },
  {
    title: 'Business',
    icon: Building2,
    keys: ['business_name', 'business_address', 'business_phone', 'business_whatsapp'],
  },
  {
    title: 'Policies',
    icon: FileText,
    keys: ['privacy_policy_content', 'terms_conditions_content', 'refund_policy_content', 'service_policy_content'],
  },
  {
    title: 'Credits',
    icon: Coins,
    keys: ['free_daily_credits', 'pro_monthly_credits', 'max_monthly_credits'],
  },
  {
    title: 'Reviews',
    icon: Star,
    keys: ['reviews_enabled', 'reviews_require_approval'],
  },
  {
    title: 'Affiliates',
    icon: Share2,
    keys: ['affiliate_enabled', 'affiliate_credit_usd_per_credit'],
  },
  {
    title: 'Features',
    icon: Zap,
    keys: ['newsletter_enabled'],
  },
];

const LABELS: Record<string, string> = {
  site_name:                 'Site Name',
  site_tagline:              'Site Tagline',
  business_name:             'Official Business Name',
  business_address:          'Office Address',
  business_phone:            'Mobile Number',
  business_whatsapp:         'WhatsApp Number',
  privacy_policy_content:    'Privacy Policy Content',
  terms_conditions_content:  'Terms & Conditions Content',
  refund_policy_content:     'Return & Refund Policy Content',
  service_policy_content:    'Shipping & Service Delivery Policy Content',
  maintenance_mode:          'Maintenance Mode',
  free_daily_credits:        'Free Daily Credits',
  pro_monthly_credits:       'Pro Monthly Credits',
  max_monthly_credits:       'Max Monthly Credits',
  reviews_enabled:           'Reviews Enabled',
  reviews_require_approval:  'Reviews Require Approval',
  affiliate_enabled:         'Affiliate Program',
  affiliate_credit_usd_per_credit: 'Estimated credit value (USD) per SavCredit',
  newsletter_enabled:        'Newsletter',
};

const DESCRIPTIONS: Record<string, string> = {
  site_name:                 'The name displayed across the platform',
  site_tagline:              'Subtitle shown on the homepage',
  business_name:             'Legal business name shown on the contact, policy, and footer sections',
  business_address:          'Public office address used across the website',
  business_phone:            'Public mobile number in international format, including the leading +',
  business_whatsapp:         'Public WhatsApp number in international format, including the leading +',
  privacy_policy_content:    'Public page body. Start section headings with ##, subheadings with ###, and list items with -. Leave a blank line between paragraphs.',
  terms_conditions_content:  'Public page body. Start section headings with ##, subheadings with ###, and list items with -. Leave a blank line between paragraphs.',
  refund_policy_content:     'Public page body. Start section headings with ##, subheadings with ###, and list items with -. Leave a blank line between paragraphs.',
  service_policy_content:    'Public page body. Start section headings with ##, subheadings with ###, and list items with -. Leave a blank line between paragraphs.',
  maintenance_mode:          'Disables public access during maintenance',
  free_daily_credits:        'Credits given to free users each day',
  pro_monthly_credits:       'Credits for Pro subscribers per month',
  max_monthly_credits:       'Credits for Max subscribers per month',
  reviews_enabled:           'Allow users to submit reviews',
  reviews_require_approval:  'Require admin approval before reviews go live',
  affiliate_enabled:         'Enable the affiliate partner program',
  affiliate_credit_usd_per_credit: 'Accounting estimate used to value referral reward credits. The default is based on the current $9.99 Pro price for 1,000 SavCredits; this is not a cash payout rate.',
  newsletter_enabled:        'Enable newsletter subscription',
};

const BOOL_KEYS = new Set(['maintenance_mode', 'reviews_enabled', 'reviews_require_approval', 'affiliate_enabled', 'newsletter_enabled']);
const POLICY_KEYS = new Set(['privacy_policy_content', 'terms_conditions_content', 'refund_policy_content', 'service_policy_content']);

export function AdminSettingsClient() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);
  const maintenanceRequestRef = useRef(false);
  const [activeTab, setActiveTab] = useState('General');
  const { success, error: err } = useToast();

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (d.ok) setSettings(d.data); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    async function revalidateMaintenance() {
      if (document.visibilityState !== 'visible' || maintenanceRequestRef.current) return;
      try {
        const response = await fetch('/api/admin/settings', { cache: 'no-store' });
        const data = await response.json();
        if (data.ok && typeof data.data?.maintenance_mode === 'string') {
          setSettings((current) => ({
            ...current,
            maintenance_mode: data.data.maintenance_mode,
          }));
        }
      } catch {
        // Keep the last confirmed state. The next focus/visibility change can retry.
      }
    }

    window.addEventListener('focus', revalidateMaintenance);
    document.addEventListener('visibilitychange', revalidateMaintenance);
    return () => {
      window.removeEventListener('focus', revalidateMaintenance);
      document.removeEventListener('visibilitychange', revalidateMaintenance);
    };
  }, []);

  async function toggleMaintenance(enabled: boolean) {
    if (maintenanceRequestRef.current) return;

    maintenanceRequestRef.current = true;
    const previous = settings.maintenance_mode ?? 'false';
    const next = enabled ? 'true' : 'false';
    setSettings((current) => ({ ...current, maintenance_mode: next }));
    setMaintenanceSaving(true);

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || 'Update failed');
      setSettings((current) => ({ ...current, maintenance_mode: next }));
      success(enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
    } catch (cause) {
      setSettings((current) => ({ ...current, maintenance_mode: previous }));
      err('Maintenance mode was not changed', cause instanceof Error ? cause.message : undefined);
    } finally {
      maintenanceRequestRef.current = false;
      setMaintenanceSaving(false);
    }
  }

  async function save() {
    setSaving(true);
    const otherSettings = Object.fromEntries(
      Object.entries(settings).filter(([key]) => key !== 'maintenance_mode'),
    );
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(otherSettings),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) throw new Error(d?.error || 'The server could not save settings.');
      success('Settings saved');
    } catch (cause) {
      err('Save failed', cause instanceof Error ? cause.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <AdminPage><PageHeader title="Settings" /><ErrorState message="Failed to load settings." /></AdminPage>;

  if (loading) {
    return (
      <AdminPage>
        <PageHeader title="Settings" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      </AdminPage>
    );
  }

  const activeSection = SECTIONS.find((s) => s.title === activeTab) ?? SECTIONS[0];

  return (
    <AdminPage>
      <PageHeader
        title="Settings"
        description="Platform-wide configuration"
        actions={
          <Button onClick={save} loading={saving} disabled={maintenanceSaving} size="sm">
            <Save className="w-3.5 h-3.5 mr-1.5" /> Save Settings
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
        {/* Tabs */}
        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {SECTIONS.map(({ title, icon: Icon }) => (
            <button
              key={title}
              onClick={() => setActiveTab(title)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all whitespace-nowrap',
                activeTab === title
                  ? 'bg-white border border-border-light text-text shadow-sm'
                  : 'text-text-muted hover:text-text hover:bg-surface/60',
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', activeTab === title ? 'text-primary' : 'text-text-subtle')} />
              {title}
            </button>
          ))}
        </div>

        {/* Content */}
        <SectionCard title={activeSection.title}>
          <div className="divide-y divide-border-light">
            {activeSection.keys.map((key) => {
              const isMaintenance = key === 'maintenance_mode';
              const maintenanceEnabled = settings.maintenance_mode === 'true';
              return (
              <div key={key} className={cn(
                'flex flex-col gap-4 px-5 py-4',
                !POLICY_KEYS.has(key) && 'sm:flex-row sm:items-start sm:justify-between',
              )}>
                <div className={cn('min-w-0', POLICY_KEYS.has(key) ? 'max-w-none' : 'max-w-2xl')}>
                  <p className="text-[13px] font-medium text-text">{LABELS[key] ?? key}</p>
                  <p className="text-[12px] text-text-muted mt-1">{DESCRIPTIONS[key] ?? ''}</p>
                  {isMaintenance && (
                    <p className={cn(
                      'mt-2 flex items-center gap-1.5 text-[12px] font-medium',
                      maintenanceSaving ? 'text-text-muted' : maintenanceEnabled ? 'text-amber-600' : 'text-emerald-600',
                    )} aria-live="polite">
                      {maintenanceSaving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                      {maintenanceSaving
                        ? 'Updating...'
                        : maintenanceEnabled
                          ? 'Public access is paused'
                          : 'Public site is available'}
                    </p>
                  )}
                </div>
                {POLICY_KEYS.has(key) ? (
                  <textarea
                    value={settings[key] ?? ''}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                    rows={18}
                    aria-label={LABELS[key] ?? key}
                    className="min-h-80 w-full resize-y rounded-lg border border-border-light bg-white px-3 py-2 font-mono text-xs leading-relaxed text-text focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                ) : BOOL_KEYS.has(key) ? (
                  <label className={cn(
                    'relative inline-flex items-center shrink-0',
                    isMaintenance && maintenanceSaving ? 'cursor-wait opacity-70' : 'cursor-pointer',
                  )}>
                    <input
                      type="checkbox"
                      checked={settings[key] === 'true'}
                      disabled={isMaintenance && maintenanceSaving}
                      onChange={(e) => {
                        if (isMaintenance) void toggleMaintenance(e.target.checked);
                        else setSettings((current) => ({ ...current, [key]: e.target.checked ? 'true' : 'false' }));
                      }}
                      className="sr-only peer"
                      aria-label={LABELS[key] ?? key}
                    />
                    <div className="w-10 h-5 bg-border-light rounded-full peer peer-disabled:cursor-not-allowed peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:shadow-sm after:transition-all peer-checked:bg-primary transition-colors" />
                  </label>
                ) : (
                  <input
                    type={key === 'affiliate_credit_usd_per_credit' ? 'number' : 'text'}
                    min={key === 'affiliate_credit_usd_per_credit' ? '0.000001' : undefined}
                    max={key === 'affiliate_credit_usd_per_credit' ? '1' : undefined}
                    step={key === 'affiliate_credit_usd_per_credit' ? '0.000001' : undefined}
                    value={settings[key] ?? ''}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                    className="w-full sm:w-64 h-9 rounded-lg border border-border-light px-3 text-[13px] text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                )}
              </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </AdminPage>
  );
}
