'use client';

import { useState, useEffect } from 'react';
import { AdminPage, PageHeader, TableCard, EmptyState } from './AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Plus, Trash2, Save } from 'lucide-react';

type Plan = { id: string; name: string; price: number; yearlyPrice?: number; credits: number; features: string[]; popular?: boolean };
type Pack = { id: string; credits: number; price: number; bonus?: number };
type PricingConfig = { plans: Plan[]; creditPacks: Pack[] };

export function AdminPricingClient() {
  const [config, setConfig]   = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const { success, error: err } = useToast();

  useEffect(() => {
    fetch('/api/admin/pricing').then((r) => r.json()).then((d) => { if (d.ok) setConfig(d.data); }).finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    const res = await fetch('/api/admin/pricing', {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) success('Pricing saved successfully');
    else err('Save failed', d?.error);
    setSaving(false);
  }

  function updatePlan(idx: number, field: keyof Plan, value: unknown) {
    if (!config) return;
    const plans = [...config.plans];
    (plans[idx] as Record<string, unknown>)[field] = value;
    setConfig({ ...config, plans });
  }

  function updatePlanFeature(planIdx: number, featIdx: number, value: string) {
    if (!config) return;
    const plans = [...config.plans];
    plans[planIdx].features[featIdx] = value;
    setConfig({ ...config, plans });
  }

  function addPlanFeature(idx: number) {
    if (!config) return;
    const plans = [...config.plans];
    plans[idx].features.push('');
    setConfig({ ...config, plans });
  }

  function removePlanFeature(planIdx: number, featIdx: number) {
    if (!config) return;
    const plans = [...config.plans];
    plans[planIdx].features.splice(featIdx, 1);
    setConfig({ ...config, plans });
  }

  function updatePack(idx: number, field: keyof Pack, value: unknown) {
    if (!config) return;
    const packs = [...config.creditPacks];
    (packs[idx] as Record<string, unknown>)[field] = value;
    setConfig({ ...config, creditPacks: packs });
  }

  function addPack() {
    if (!config) return;
    setConfig({ ...config, creditPacks: [...config.creditPacks, { id: `pack_${Date.now()}`, credits: 100, price: 2, bonus: 0 }] });
  }

  function removePack(idx: number) {
    if (!config) return;
    const packs = [...config.creditPacks];
    packs.splice(idx, 1);
    setConfig({ ...config, creditPacks: packs });
  }

  if (loading) return <AdminPage><div className="animate-pulse space-y-4">{Array.from({length: 4}).map((_,i) => <div key={i} className="h-24 rounded-2xl bg-surface" />)}</div></AdminPage>;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin"
        title="Pricing Management"
        description="Manage plans and credit packages. Changes are stored centrally."
        actions={
          <Button onClick={save} loading={saving} size="sm">
            <Save className="w-3.5 h-3.5" /> Save All Changes
          </Button>
        }
      />

      {/* Plans */}
      <h2 className="text-sm font-semibold text-text mb-4">Subscription Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        {config?.plans.map((plan, idx) => (
          <TableCard key={plan.id}>
            <div className="p-4 border-b border-border bg-surface">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">{plan.id}</p>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-text-muted block mb-1">Name</label>
                <input value={plan.name} onChange={(e) => updatePlan(idx, 'name', e.target.value)}
                  className="w-full h-8 rounded-lg border border-border px-2.5 text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Monthly Price ($)</label>
                  <input type="number" min={0} value={plan.price} onChange={(e) => updatePlan(idx, 'price', parseFloat(e.target.value))}
                    className="w-full h-8 rounded-lg border border-border px-2.5 text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Yearly Price ($)</label>
                  <input type="number" min={0} value={plan.yearlyPrice ?? ''} onChange={(e) => updatePlan(idx, 'yearlyPrice', parseFloat(e.target.value))}
                    className="w-full h-8 rounded-lg border border-border px-2.5 text-sm focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Credits / period</label>
                <input type="number" min={0} value={plan.credits} onChange={(e) => updatePlan(idx, 'credits', parseInt(e.target.value))}
                  className="w-full h-8 rounded-lg border border-border px-2.5 text-sm focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1">Features</label>
                <div className="space-y-1.5">
                  {plan.features.map((f, fi) => (
                    <div key={fi} className="flex gap-1">
                      <input value={f} onChange={(e) => updatePlanFeature(idx, fi, e.target.value)}
                        className="flex-1 h-7 rounded-lg border border-border px-2 text-xs focus:outline-none focus:border-primary/50" />
                      <button onClick={() => removePlanFeature(idx, fi)} className="p-1 text-text-muted hover:text-rose-600 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addPlanFeature(idx)} className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Plus className="w-3 h-3" /> Add feature
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                <input type="checkbox" checked={!!plan.popular} onChange={(e) => updatePlan(idx, 'popular', e.target.checked)} className="accent-primary" />
                Mark as popular
              </label>
            </div>
          </TableCard>
        ))}
      </div>

      {/* Credit packs */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text">Credit Packages</h2>
        <button onClick={addPack} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <Plus className="w-3.5 h-3.5" /> Add Package
        </button>
      </div>
      <TableCard>
        <div className="divide-y divide-border">
          {config?.creditPacks.length === 0 ? <EmptyState message="No credit packages." /> : (
            config?.creditPacks.map((pack, idx) => (
              <div key={pack.id} className="grid grid-cols-4 gap-3 px-5 py-3.5 items-center">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Credits</label>
                  <input type="number" min={1} value={pack.credits} onChange={(e) => updatePack(idx, 'credits', parseInt(e.target.value))}
                    className="w-full h-8 rounded-lg border border-border px-2.5 text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Price ($)</label>
                  <input type="number" min={0} step="0.01" value={pack.price} onChange={(e) => updatePack(idx, 'price', parseFloat(e.target.value))}
                    className="w-full h-8 rounded-lg border border-border px-2.5 text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">Bonus Credits</label>
                  <input type="number" min={0} value={pack.bonus ?? 0} onChange={(e) => updatePack(idx, 'bonus', parseInt(e.target.value))}
                    className="w-full h-8 rounded-lg border border-border px-2.5 text-sm focus:outline-none focus:border-primary/50" />
                </div>
                <div className="flex items-end">
                  <button onClick={() => removePack(idx)} className="p-2 rounded-lg hover:bg-rose-50 text-text-muted hover:text-rose-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </TableCard>
    </AdminPage>
  );
}
