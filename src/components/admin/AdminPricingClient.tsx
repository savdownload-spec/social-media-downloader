'use client';

import { useState, useEffect } from 'react';
import { AdminPage, PageHeader, TableCard, EmptyState } from './AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Plus, Trash2, Save } from 'lucide-react';
import type { PricingConfig, RawPlan, RawPack } from '@/config/pricing';

const input =
  'w-full h-8 rounded-lg border border-border px-2.5 text-sm focus:outline-none focus:border-primary/50';

/** Editor for a string list (features, benefits, fair-use notes). */
function ListEditor({
  items,
  onChange,
  addLabel,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((v, i) => (
        <div key={i} className="flex gap-1">
          <input
            value={v}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            className="flex-1 h-7 rounded-lg border border-border px-2 text-xs focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="p-1 text-text-muted transition-colors hover:text-rose-600"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ''])}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <Plus className="h-3 w-3" /> {addLabel}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-text-muted">{label}</label>
      {children}
    </div>
  );
}

export function AdminPricingClient() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error: err } = useToast();

  useEffect(() => {
    fetch('/api/admin/pricing')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setConfig(d.data);
      })
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
    if (d?.ok) success('Pricing saved. The public site will update on next load.');
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
    const order = config.packs.length;
    setConfig({
      ...config,
      packs: [...config.packs, { id: `pack_${Date.now()}`, name: 'New pack', tagline: '', credits: 500, price: 5, order, visible: true }],
    });
  }
  function removePack(idx: number) {
    if (!config) return;
    setConfig({ ...config, packs: config.packs.filter((_, i) => i !== idx) });
  }

  if (loading || !config) {
    return (
      <AdminPage>
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface" />
          ))}
        </div>
      </AdminPage>
    );
  }

  const num = (v: string) => (v === '' ? 0 : parseFloat(v));

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Admin"
        title="Pricing Management"
        description="One source of truth. Saving here updates the pricing page, nav and mobile menu on their next load."
        actions={
          <Button onClick={save} loading={saving} size="sm">
            <Save className="h-3.5 w-3.5" /> Save All Changes
          </Button>
        }
      />

      {/* Subscription plans */}
      <h2 className="mb-4 text-sm font-semibold text-text">Subscription Plans</h2>
      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {config.plans.map((plan, idx) => (
          <TableCard key={plan.id}>
            <div className="flex items-center justify-between border-b border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{plan.id}</p>
              <label className="flex items-center gap-1.5 text-xs text-text-muted">
                <input type="checkbox" checked={plan.visible} onChange={(e) => patchPlan(idx, { visible: e.target.checked })} className="accent-primary" />
                Visible
              </label>
            </div>
            <div className="space-y-3 p-4">
              <Field label="Name">
                <input value={plan.name} onChange={(e) => patchPlan(idx, { name: e.target.value })} className={input} />
              </Field>
              <Field label="Tagline">
                <input value={plan.tagline} onChange={(e) => patchPlan(idx, { tagline: e.target.value })} className={input} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Monthly Price ($)">
                  <input type="number" min={0} step="0.01" value={plan.monthlyPrice} onChange={(e) => patchPlan(idx, { monthlyPrice: num(e.target.value) })} className={input} />
                </Field>
                <Field label="Yearly Price ($)">
                  <input type="number" min={0} step="0.01" value={plan.yearlyPrice} onChange={(e) => patchPlan(idx, { yearlyPrice: num(e.target.value) })} className={input} />
                </Field>
              </div>
              <Field label="Monthly Credits">
                <input type="number" min={0} value={plan.monthlyCredits} onChange={(e) => patchPlan(idx, { monthlyCredits: num(e.target.value) })} className={input} />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Credits label (optional)">
                  <input value={plan.creditsLabel ?? ''} placeholder="e.g. 10 credits / day" onChange={(e) => patchPlan(idx, { creditsLabel: e.target.value || undefined })} className={input} />
                </Field>
                <Field label="Credits note (optional)">
                  <input value={plan.creditsNote ?? ''} placeholder="e.g. up to 300 / month" onChange={(e) => patchPlan(idx, { creditsNote: e.target.value || undefined })} className={input} />
                </Field>
              </div>
              <Field label="Features">
                <ListEditor items={plan.features} onChange={(features) => patchPlan(idx, { features })} addLabel="Add feature" />
              </Field>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
                <input type="checkbox" checked={!!plan.popular} onChange={(e) => patchPlan(idx, { popular: e.target.checked })} className="accent-primary" />
                Mark as most popular
              </label>
            </div>
          </TableCard>
        ))}
      </div>

      {/* Credit packs */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Credit Packs</h2>
        <button onClick={addPack} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add Pack
        </button>
      </div>
      <TableCard>
        <div className="divide-y divide-border">
          {config.packs.length === 0 ? (
            <EmptyState message="No credit packs." />
          ) : (
            config.packs.map((pack, idx) => (
              <div key={pack.id} className="grid grid-cols-2 items-end gap-3 px-5 py-3.5 md:grid-cols-6">
                <Field label="Name">
                  <input value={pack.name} onChange={(e) => patchPack(idx, { name: e.target.value })} className={input} />
                </Field>
                <Field label="Tagline">
                  <input value={pack.tagline} onChange={(e) => patchPack(idx, { tagline: e.target.value })} className={input} />
                </Field>
                <Field label="Credits">
                  <input type="number" min={1} value={pack.credits} onChange={(e) => patchPack(idx, { credits: num(e.target.value) })} className={input} />
                </Field>
                <Field label="Price ($)">
                  <input type="number" min={0} step="0.01" value={pack.price} onChange={(e) => patchPack(idx, { price: num(e.target.value) })} className={input} />
                </Field>
                <Field label="Bonus">
                  <input type="number" min={0} value={pack.bonus ?? 0} onChange={(e) => patchPack(idx, { bonus: num(e.target.value) || undefined })} className={input} />
                </Field>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-text-muted">
                    <input type="checkbox" checked={pack.visible} onChange={(e) => patchPack(idx, { visible: e.target.checked })} className="accent-primary" />
                    Show
                  </label>
                  <button onClick={() => removePack(idx)} className="rounded-lg p-2 text-text-muted transition-colors hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </TableCard>

      {/* Lifetime */}
      <h2 className="mb-4 mt-10 text-sm font-semibold text-text">Lifetime Plan</h2>
      <TableCard>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <Field label="Name">
            <input value={config.lifetime.name} onChange={(e) => setConfig({ ...config, lifetime: { ...config.lifetime, name: e.target.value } })} className={input} />
          </Field>
          <Field label="Tagline">
            <input value={config.lifetime.tagline} onChange={(e) => setConfig({ ...config, lifetime: { ...config.lifetime, tagline: e.target.value } })} className={input} />
          </Field>
          <Field label="Price ($, one-time)">
            <input type="number" min={0} step="0.01" value={config.lifetime.price} onChange={(e) => setConfig({ ...config, lifetime: { ...config.lifetime, price: num(e.target.value) } })} className={input} />
          </Field>
          <Field label="Lifetime credits (finite)">
            <input type="number" min={0} value={config.lifetime.credits} onChange={(e) => setConfig({ ...config, lifetime: { ...config.lifetime, credits: num(e.target.value) } })} className={input} />
          </Field>
          <Field label="Benefits">
            <ListEditor items={config.lifetime.benefits} onChange={(benefits) => setConfig({ ...config, lifetime: { ...config.lifetime, benefits } })} addLabel="Add benefit" />
          </Field>
          <Field label="Fair-use notes">
            <ListEditor items={config.lifetime.fairUse} onChange={(fairUse) => setConfig({ ...config, lifetime: { ...config.lifetime, fairUse } })} addLabel="Add note" />
          </Field>
        </div>
      </TableCard>
    </AdminPage>
  );
}
