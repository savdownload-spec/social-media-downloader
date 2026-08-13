'use client';

import { useState, useEffect } from 'react';
import { AdminPage, PageHeader, TableCard } from './AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Save } from 'lucide-react';

type Settings = Record<string, string>;

const SECTIONS = [
  {
    title: 'General',
    keys: ['site_name', 'site_tagline', 'maintenance_mode'],
  },
  {
    title: 'Credits',
    keys: ['free_daily_credits', 'pro_monthly_credits', 'max_monthly_credits'],
  },
  {
    title: 'Reviews',
    keys: ['reviews_enabled', 'reviews_require_approval'],
  },
  {
    title: 'Affiliates',
    keys: ['affiliate_enabled', 'affiliate_commission_rate'],
  },
  {
    title: 'Features',
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
  affiliate_enabled:         'Affiliate Program Enabled',
  affiliate_commission_rate: 'Affiliate Commission Rate (%)',
  newsletter_enabled:        'Newsletter Enabled',
};

const BOOL_KEYS = new Set(['maintenance_mode', 'reviews_enabled', 'reviews_require_approval', 'affiliate_enabled', 'newsletter_enabled']);

export function AdminSettingsClient() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const { success, error: err } = useToast();

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((d) => { if (d.ok) setSettings(d.data); }).finally(() => setLoading(false));
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

  if (loading) return <AdminPage><div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-surface animate-pulse" />)}</div></AdminPage>;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin"
        title="Settings"
        description="Platform-wide configuration"
        actions={
          <Button onClick={save} loading={saving} size="sm">
            <Save className="w-3.5 h-3.5" /> Save Settings
          </Button>
        }
      />

      <div className="space-y-6">
        {SECTIONS.map(({ title, keys }) => (
          <TableCard key={title}>
            <div className="px-5 py-3.5 border-b border-border bg-surface">
              <p className="text-sm font-semibold text-text">{title}</p>
            </div>
            <div className="divide-y divide-border">
              {keys.map((key) => (
                <div key={key} className="flex items-center justify-between px-5 py-4 gap-6">
                  <div>
                    <p className="text-sm font-medium text-text">{LABELS[key] ?? key}</p>
                    <p className="text-xs text-text-muted font-mono">{key}</p>
                  </div>
                  {BOOL_KEYS.has(key) ? (
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings[key] === 'true'}
                        onChange={(e) => setSettings({ ...settings, [key]: e.target.checked ? 'true' : 'false' })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-surface peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border" />
                    </label>
                  ) : (
                    <input
                      value={settings[key] ?? ''}
                      onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                      className="w-48 h-9 rounded-xl border border-border px-3 text-sm focus:outline-none focus:border-primary/50 text-right bg-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </TableCard>
        ))}
      </div>
    </AdminPage>
  );
}
