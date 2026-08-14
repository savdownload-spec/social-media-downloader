'use client';

import { useState, useEffect } from 'react';
import { AdminPage, PageHeader, SectionCard, EmptyState, ErrorState, Skeleton, ActionButton } from './AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Plus, Trash2, Save, Eye, EyeOff, Crown } from 'lucide-react';
import type { PricingConfig, RawPlan, RawPack } from '@/config/pricing';

const fieldCls =
  'w-full h-8 rounded-lg border border-border-light px-2.5 text-[13px] text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';
const labelCls = 'block text-[11px] font-medium text-text-muted mb-1';

function ListEditor({ items, onChange, addLabel }: { items: string[]; onChange: (next: string[]) => void; addLabel: string }) {
  return (
    <div className="space-y-1.5">
      {items.map((v, i) => (
        <div key={i} className="flex gap-1.5">
          <input
            value={v}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            className="flex-1 h-7 rounded-lg border border-border-light px-2 text-[12px] text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1 text-text-subtle hover:text-rose-600 transition-colors">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ''])} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline">
        <Plus className="h-3 w-3" /> {addLabel}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export function AdminPricingClient() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error: err } = useToast();

  useEffect(() => {
    fetch('/api/admin/pricing')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setConfig(d.data); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    const res = await fetch('/api/admin/pricing', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) success('Pricing saved. Public site updates on next load.');
    else err('Save failed', d?.error);
    setSaving(false);
  }

  function patchPlan(idx: number, patch: Partial<RawPlan>) {
    if (!config) return;
    setConfig({ ...config, plans: config.plans.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });
  }
  function patchPack(idx: number, patch: Partial<RawPack>) {
    if (!config) return;
    setConfig({ ...config, packs: config.packs.map((p, i) => (i === idx ? { ...p, ...patch } : p)) });
  }
  function addPack() {
    if (!config) return;
    setConfig({
      ...config,
      packs: [...config.packs, { id: `pack_${Date.now()}`, name: 'New Pack', tagline: '', credits: 500, price: 5, order: config.packs.length, visible: true }],
    });
  }
  function removePack(idx: number) {
    if (!config) return;
    setConfig({ ...config, packs: config.packs.filter((_, i) => i !== idx) });
  }

  const num = (v: string) => (v === '' ? 0 : parseFloat(v));

  if (error) return <AdminPage><PageHeader title="Pricing Management" /><ErrorState message="Failed to load pricing configuration." /></AdminPage>;

  if (loading || !config) {
    return (
      <AdminPage>
        <PageHeader title="Pricing Management" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <PageHeader
        title="Pricing Management"
        description="Configure subscription plans, credit packs, and lifetime pricing. Changes apply on next page load."
        actions={
          <Button onClick={save} loading={saving} size="sm">
            <Save className="h-3.5 w-3.5 mr-1.5" /> Save All Changes
          </Button>
        }
      />

      {/* Subscription Plans */}
      <div className="mb-8">
        <h2 className="text-[13px] font-semibold text-text mb-3">Subscription Plans</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {config.plans.map((plan, idx) => (
            <SectionCard
              key={plan.id}
              title={plan.name || plan.id}
              subtitle={plan.tagline}
              actions={
                <div className="flex items-center gap-2">
                  {plan.popular && (
                    <span className="text-[10px] font-semibold text-primary bg-primary/[0.08] px-1.5 py-0.5 rounded-md flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Popular
                    </span>
                  )}
                  <button
                    onClick={() => patchPlan(idx, { visible: !plan.visible })}
                    className="p-1 text-text-subtle hover:text-text transition-colors"
                    title={plan.visible ? 'Visible' : 'Hidden'}
                  >
                    {plan.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              }
            >
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Name">
                    <input value={plan.name} onChange={(e) => patchPlan(idx, { name: e.target.value })} className={fieldCls} />
                  </Field>
                  <Field label="Tagline">
                    <input value={plan.tagline} onChange={(e) => patchPlan(idx, { tagline: e.target.value })} className={fieldCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Monthly ($)">
                    <input type="number" min={0} step="0.01" value={plan.monthlyPrice} onChange={(e) => patchPlan(idx, { monthlyPrice: num(e.target.value) })} className={fieldCls} />
                  </Field>
                  <Field label="Yearly ($)">
                    <input type="number" min={0} step="0.01" value={plan.yearlyPrice} onChange={(e) => patchPlan(idx, { yearlyPrice: num(e.target.value) })} className={fieldCls} />
                  </Field>
                  <Field label="Monthly Credits">
                    <input type="number" min={0} value={plan.monthlyCredits} onChange={(e) => patchPlan(idx, { monthlyCredits: num(e.target.value) })} className={fieldCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Credits Label">
                    <input value={plan.creditsLabel ?? ''} placeholder="e.g. 10 credits / day" onChange={(e) => patchPlan(idx, { creditsLabel: e.target.value || undefined })} className={fieldCls} />
                  </Field>
                  <Field label="Credits Note">
                    <input value={plan.creditsNote ?? ''} placeholder="e.g. up to 300 / month" onChange={(e) => patchPlan(idx, { creditsNote: e.target.value || undefined })} className={fieldCls} />
                  </Field>
                </div>
                <Field label="Features">
                  <ListEditor items={plan.features} onChange={(features) => patchPlan(idx, { features })} addLabel="Add feature" />
                </Field>
                <label className="flex items-center gap-2 text-[12px] text-text-muted cursor-pointer">
                  <input type="checkbox" checked={!!plan.popular} onChange={(e) => patchPlan(idx, { popular: e.target.checked })} className="accent-primary rounded" />
                  Mark as most popular
                </label>
              </div>
            </SectionCard>
          ))}
        </div>
      </div>

      {/* Credit Packs */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-text">Credit Packs</h2>
          <ActionButton variant="ghost" icon={Plus} onClick={addPack}>Add Pack</ActionButton>
        </div>
        <SectionCard>
          {config.packs.length === 0 ? (
            <EmptyState title="No credit packs" message="Add a credit pack to offer one-time credit purchases." />
          ) : (
            <div className="divide-y divide-border-light">
              {config.packs.map((pack, idx) => (
                <div key={pack.id} className="grid grid-cols-2 items-end gap-3 px-4 py-3.5 md:grid-cols-6">
                  <Field label="Name">
                    <input value={pack.name} onChange={(e) => patchPack(idx, { name: e.target.value })} className={fieldCls} />
                  </Field>
                  <Field label="Tagline">
                    <input value={pack.tagline} onChange={(e) => patchPack(idx, { tagline: e.target.value })} className={fieldCls} />
                  </Field>
                  <Field label="Credits">
                    <input type="number" min={1} value={pack.credits} onChange={(e) => patchPack(idx, { credits: num(e.target.value) })} className={fieldCls} />
                  </Field>
                  <Field label="Price ($)">
                    <input type="number" min={0} step="0.01" value={pack.price} onChange={(e) => patchPack(idx, { price: num(e.target.value) })} className={fieldCls} />
                  </Field>
                  <Field label="Bonus">
                    <input type="number" min={0} value={pack.bonus ?? 0} onChange={(e) => patchPack(idx, { bonus: num(e.target.value) || undefined })} className={fieldCls} />
                  </Field>
                  <div className="flex items-center gap-2 pb-0.5">
                    <label className="flex items-center gap-1.5 text-[11px] text-text-muted cursor-pointer">
                      <input type="checkbox" checked={pack.visible} onChange={(e) => patchPack(idx, { visible: e.target.checked })} className="accent-primary" />
                      Show
                    </label>
                    <button onClick={() => removePack(idx)} className="p-1.5 rounded-lg text-text-subtle hover:bg-rose-50 hover:text-rose-600 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Lifetime Plan */}
      <div>
        <h2 className="text-[13px] font-semibold text-text mb-3">Lifetime Plan</h2>
        <SectionCard>
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
            <Field label="Name">
              <input value={config.lifetime.name} onChange={(e) => setConfig({ ...config, lifetime: { ...config.lifetime, name: e.target.value } })} className={fieldCls} />
            </Field>
            <Field label="Tagline">
              <input value={config.lifetime.tagline} onChange={(e) => setConfig({ ...config, lifetime: { ...config.lifetime, tagline: e.target.value } })} className={fieldCls} />
            </Field>
            <Field label="Price ($ one-time)">
              <input type="number" min={0} step="0.01" value={config.lifetime.price} onChange={(e) => setConfig({ ...config, lifetime: { ...config.lifetime, price: num(e.target.value) } })} className={fieldCls} />
            </Field>
            <Field label="Lifetime Credits (finite)">
              <input type="number" min={0} value={config.lifetime.credits} onChange={(e) => setConfig({ ...config, lifetime: { ...config.lifetime, credits: num(e.target.value) } })} className={fieldCls} />
            </Field>
            <Field label="Benefits">
              <ListEditor items={config.lifetime.benefits} onChange={(benefits) => setConfig({ ...config, lifetime: { ...config.lifetime, benefits } })} addLabel="Add benefit" />
            </Field>
            <Field label="Fair-use Notes">
              <ListEditor items={config.lifetime.fairUse} onChange={(fairUse) => setConfig({ ...config, lifetime: { ...config.lifetime, fairUse } })} addLabel="Add note" />
            </Field>
          </div>
        </SectionCard>
      </div>
    </AdminPage>
  );
}
