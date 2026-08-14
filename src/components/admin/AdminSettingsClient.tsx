'use client';

import { useState, useEffect } from 'react';
import { AdminPage, PageHeader, SectionCard, ErrorState, Skeleton } from './AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Save, Settings, Coins, Star, Share2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type Settings = Record<string, string>;

const SECTIONS = [
  {
    title: 'General',
    icon: Settings,
    keys: ['site_name', 'site_tagline', 'maintenance_mode'],
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
    keys: ['affiliate_enabled', 'affiliate_commission_rate'],
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
  maintenance_mode:          'Maintenance Mode',
  free_daily_credits:        'Free Daily Credits',
  pro_monthly_credits:       'Pro Monthly Credits',
  max_monthly_credits:       'Max Monthly Credits',
  reviews_enabled:           'Reviews Enabled',
  reviews_require_approval:  'Reviews Require Approval',
  affiliate_enabled:         'Affiliate Program',
  affiliate_commission_rate: 'Commission Rate (%)',
  newsletter_enabled:        'Newsletter',
};

const DESCRIPTIONS: Record<string, string> = {
  site_name:                 'The name displayed across the platform',
  site_tagline:              'Subtitle shown on the homepage',
  maintenance_mode:          'Disables public access during maintenance',
  free_daily_credits:        'Credits given to free users each day',
  pro_monthly_credits:       'Credits for Pro subscribers per month',
  max_monthly_credits:       'Credits for Max subscribers per month',
  reviews_enabled:           'Allow users to submit reviews',
  reviews_require_approval:  'Require admin approval before reviews go live',
  affiliate_enabled:         'Enable the affiliate partner program',
  affiliate_commission_rate: 'Percentage commission for affiliates',
  newsletter_enabled:        'Enable newsletter subscription',
};

const BOOL_KEYS = new Set(['maintenance_mode', 'reviews_enabled', 'reviews_require_approval', 'affiliate_enabled', 'newsletter_enabled']);

export function AdminSettingsClient() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [activeTab, setActiveTab] = useState('General');
  const { success, error: err } = useToast();

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setSettings(d.data); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) success('Settings saved');
    else err('Save failed', d?.error);
    setSaving(false);
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
          <Button onClick={save} loading={saving} size="sm">
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
            {activeSection.keys.map((key) => (
              <div key={key} className="flex items-center justify-between px-5 py-4 gap-6">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-text">{LABELS[key] ?? key}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{DESCRIPTIONS[key] ?? ''}</p>
                </div>
                {BOOL_KEYS.has(key) ? (
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settings[key] === 'true'}
                      onChange={(e) => setSettings({ ...settings, [key]: e.target.checked ? 'true' : 'false' })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-border-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:shadow-sm after:transition-all peer-checked:bg-primary transition-colors" />
                  </label>
                ) : (
                  <input
                    value={settings[key] ?? ''}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                    className="w-48 h-9 rounded-lg border border-border-light px-3 text-[13px] text-text text-right bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shrink-0"
                  />
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AdminPage>
  );
}
