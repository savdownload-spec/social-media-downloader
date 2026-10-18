'use client';

import { useEffect, useState } from 'react';
import { Archive, ArrowDown, ArrowUp, Copy, Crown, Eye, EyeOff, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { AdminPage, EmptyState, ErrorState, PageHeader, SectionCard, Skeleton } from './AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { BillingPeriod, PricingConfig, RawLifetime, RawPack, RawPlan } from '@/config/pricing';

const fieldCls = 'w-full h-9 rounded-lg border border-border-light px-2.5 text-[13px] text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40';
const labelCls = 'block text-[11px] font-medium text-text-muted mb-1';
const iconCls = 'rounded-lg p-1.5 text-text-subtle hover:bg-primary/[0.08] hover:text-primary disabled:opacity-30';
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={wide ? 'md:col-span-2' : ''}><label className={labelCls}>{label}</label>{children}</div>;
}

function ListEditor({ items, onChange, addLabel }: { items: string[]; onChange: (next: string[]) => void; addLabel: string }) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items]; [next[from], next[to]] = [next[to], next[from]]; onChange(next);
  };
  return <div className="space-y-1.5">
    {items.map((value, index) => <div key={index} className="flex gap-1.5">
      <input value={value} onChange={(e) => onChange(items.map((item, i) => i === index ? e.target.value : item))} className={fieldCls} />
      <button type="button" className={iconCls} disabled={index === 0} onClick={() => move(index, index - 1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
      <button type="button" className={iconCls} disabled={index === items.length - 1} onClick={() => move(index, index + 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
      <button type="button" className={iconCls} onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>)}
    <button type="button" onClick={() => onChange([...items, ''])} className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"><Plus className="h-3 w-3" />{addLabel}</button>
  </div>;
}

function ItemActions({ visible, archived, index, count, onVisible, onArchive, onDuplicate, onMove, onRemove }: {
  visible: boolean; archived?: boolean; index: number; count: number; onVisible: () => void; onArchive: () => void; onDuplicate: () => void; onMove: (to: number) => void; onRemove: () => void;
}) {
  return <div className="flex items-center gap-1">
    <button type="button" className={iconCls} onClick={onVisible} title={visible ? 'Hide' : 'Show'}>{visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
    <button type="button" className={iconCls} disabled={index === 0} onClick={() => onMove(index - 1)} title="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
    <button type="button" className={iconCls} disabled={index === count - 1} onClick={() => onMove(index + 1)} title="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
    <button type="button" className={iconCls} onClick={onDuplicate} title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
    <button type="button" className={iconCls} onClick={onArchive} title={archived ? 'Restore' : 'Archive'}>{archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}</button>
    <button type="button" className={`${iconCls} hover:bg-rose-50 hover:text-rose-600`} onClick={onRemove} title="Permanently remove"><Trash2 className="h-3.5 w-3.5" /></button>
  </div>;
}

export function AdminPricingClient() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const toast = useToast();
  const num = (value: string) => value === '' ? 0 : Number(value);

  useEffect(() => { fetch('/api/admin/pricing').then((r) => r.json()).then((p) => p.ok ? setConfig(p.data) : setLoadError(true)).catch(() => setLoadError(true)).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => event.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);

  const update = (next: PricingConfig) => { setConfig(next); setDirty(true); };
  const patchPlan = (index: number, patch: Partial<RawPlan>) => config && update({ ...config, plans: config.plans.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const patchPack = (index: number, patch: Partial<RawPack>) => config && update({ ...config, packs: config.packs.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const patchLifetime = (index: number, patch: Partial<RawLifetime>) => config && update({ ...config, lifetimes: config.lifetimes.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const reorder = <T,>(items: T[], from: number, to: number): T[] => { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next.map((value, order) => ({ ...value as object, order }) as T); };
  const remove = (kind: 'plan' | 'pack' | 'lifetime', index: number) => {
    if (!config || !window.confirm('Permanently remove this option? Saving is blocked when billing history exists. Archive it to preserve historical references.')) return;
    if (kind === 'plan') update({ ...config, plans: config.plans.filter((_, i) => i !== index) });
    if (kind === 'pack') update({ ...config, packs: config.packs.filter((_, i) => i !== index) });
    if (kind === 'lifetime') update({ ...config, lifetimes: config.lifetimes.filter((_, i) => i !== index) });
  };

  async function save() {
    if (!config || saving || !dirty) return; setSaving(true);
    try {
      const response = await fetch('/api/admin/pricing', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? 'Pricing could not be saved.');
      setConfig(payload.data); setDirty(false); toast.success('Pricing published successfully.');
    } catch (error) { toast.error('Save failed', error instanceof Error ? error.message : undefined); } finally { setSaving(false); }
  }

  if (loadError) return <AdminPage><PageHeader title="Pricing Management" /><ErrorState message="Failed to load pricing configuration." /></AdminPage>;
  if (loading || !config) return <AdminPage><PageHeader title="Pricing Management" /><div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}</div></AdminPage>;

  const addPlan = () => update({ ...config, plans: [...config.plans, { id: uid('plan'), name: 'New plan', tagline: '', description: '', monthlyPrice: 10, yearlyPrice: 100, monthlyCredits: 1000, features: [], billingIntervals: ['monthly', 'yearly'], entitlementTier: 'PRO', popular: false, order: config.plans.length, visible: false, archived: false }] });
  const addPack = () => update({ ...config, packs: [...config.packs, { id: uid('pack'), name: 'New pack', tagline: '', credits: 500, price: 5, bonus: 0, order: config.packs.length, visible: false, archived: false }] });
  const addLifetime = () => update({ ...config, lifetimes: [...config.lifetimes, { id: uid('lifetime'), name: 'New lifetime plan', tagline: '', price: 199, credits: 30000, benefits: [], fairUse: ['Finite credit allocation; not unlimited processing.'], order: config.lifetimes.length, visible: false, archived: false }] });

  return <AdminPage>
    <PageHeader title="Pricing Management" description="Manage published offers. Stable IDs cannot be edited; archive offers with billing history instead of deleting them." actions={<div className="flex items-center gap-3"><span className={`text-xs ${dirty ? 'text-amber-600' : 'text-emerald-600'}`}>{saving ? 'Publishing…' : dirty ? 'Unsaved changes' : 'All changes saved'}</span><Button onClick={save} loading={saving} disabled={!dirty} size="sm"><Save className="mr-1.5 h-3.5 w-3.5" />Save All Changes</Button></div>} />

    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-[13px] font-semibold text-text">Subscription Plans</h2><Button size="sm" variant="secondary" onClick={addPlan}><Plus className="mr-1 h-3.5 w-3.5" />Add Subscription Plan</Button></div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{config.plans.map((plan, index) => <SectionCard key={plan.id} title={plan.name || plan.id} subtitle={`${plan.id}${plan.archived ? ' · Archived' : ''}`} actions={<ItemActions visible={plan.visible} archived={plan.archived} index={index} count={config.plans.length} onVisible={() => patchPlan(index, { visible: !plan.visible })} onArchive={() => patchPlan(index, { archived: !plan.archived, visible: false })} onDuplicate={() => update({ ...config, plans: [...config.plans, { ...plan, id: uid('plan'), name: `${plan.name} copy`, popular: false, visible: false, archived: false, order: config.plans.length }] })} onMove={(to) => update({ ...config, plans: reorder(config.plans, index, to) })} onRemove={() => remove('plan', index)} />}>
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          <Field label="Name"><input className={fieldCls} value={plan.name} onChange={(e) => patchPlan(index, { name: e.target.value })} /></Field><Field label="Tagline"><input className={fieldCls} value={plan.tagline} onChange={(e) => patchPlan(index, { tagline: e.target.value })} /></Field>
          <Field label="Description" wide><textarea className={`${fieldCls} h-20 py-2`} value={plan.description ?? ''} onChange={(e) => patchPlan(index, { description: e.target.value })} /></Field>
          <Field label="Monthly price ($)"><input className={fieldCls} type="number" min={0} step="0.01" value={plan.monthlyPrice} onChange={(e) => patchPlan(index, { monthlyPrice: num(e.target.value) })} /></Field><Field label="Yearly price ($)"><input className={fieldCls} type="number" min={0} step="0.01" value={plan.yearlyPrice} onChange={(e) => patchPlan(index, { yearlyPrice: num(e.target.value) })} /></Field>
          <Field label="Monthly credits"><input className={fieldCls} type="number" min={0} value={plan.monthlyCredits} onChange={(e) => patchPlan(index, { monthlyCredits: num(e.target.value) })} /></Field><Field label="Entitlement"><select className={fieldCls} value={plan.entitlementTier} onChange={(e) => patchPlan(index, { entitlementTier: e.target.value as RawPlan['entitlementTier'] })}><option>FREE</option><option>PRO</option><option>MAX</option></select></Field>
          <Field label="Credits label"><input className={fieldCls} value={plan.creditsLabel ?? ''} onChange={(e) => patchPlan(index, { creditsLabel: e.target.value || undefined })} /></Field><Field label="Credits note"><input className={fieldCls} value={plan.creditsNote ?? ''} onChange={(e) => patchPlan(index, { creditsNote: e.target.value || undefined })} /></Field>
          <Field label="Billing intervals" wide><div className="flex gap-4">{(['monthly', 'yearly'] as BillingPeriod[]).map((period) => <label key={period} className="flex items-center gap-2 text-xs capitalize"><input type="checkbox" checked={plan.billingIntervals.includes(period)} onChange={(e) => patchPlan(index, { billingIntervals: e.target.checked ? [...plan.billingIntervals, period] : plan.billingIntervals.filter((item) => item !== period) })} />{period}</label>)}</div></Field>
          <Field label="Features" wide><ListEditor items={plan.features} onChange={(features) => patchPlan(index, { features })} addLabel="Add feature" /></Field>
          <Field label="Promotion" wide><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!plan.popular} onChange={(e) => update({ ...config, plans: config.plans.map((item, i) => ({ ...item, popular: i === index ? e.target.checked : false })) })} /><Crown className="h-3.5 w-3.5 text-primary" />Mark as the single most-popular plan</label></Field>
        </div>
      </SectionCard>)}</div>
    </div>

    <div className="mb-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-[13px] font-semibold text-text">Credit Packs</h2><Button size="sm" variant="secondary" onClick={addPack}><Plus className="mr-1 h-3.5 w-3.5" />Add Credit Pack</Button></div>
      {config.packs.length === 0 ? <EmptyState title="No credit packs" message="Add a pack to offer one-time credits." /> : <div className="space-y-3">{config.packs.map((pack, index) => <SectionCard key={pack.id} title={pack.name} subtitle={`${pack.id}${pack.archived ? ' · Archived' : ''}`} actions={<ItemActions visible={pack.visible} archived={pack.archived} index={index} count={config.packs.length} onVisible={() => patchPack(index, { visible: !pack.visible })} onArchive={() => patchPack(index, { archived: !pack.archived, visible: false })} onDuplicate={() => update({ ...config, packs: [...config.packs, { ...pack, id: uid('pack'), name: `${pack.name} copy`, visible: false, archived: false, order: config.packs.length }] })} onMove={(to) => update({ ...config, packs: reorder(config.packs, index, to) })} onRemove={() => remove('pack', index)} />}><div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-5"><Field label="Name"><input className={fieldCls} value={pack.name} onChange={(e) => patchPack(index, { name: e.target.value })} /></Field><Field label="Tagline"><input className={fieldCls} value={pack.tagline} onChange={(e) => patchPack(index, { tagline: e.target.value })} /></Field><Field label="Credits"><input className={fieldCls} type="number" min={1} value={pack.credits} onChange={(e) => patchPack(index, { credits: num(e.target.value) })} /></Field><Field label="Bonus"><input className={fieldCls} type="number" min={0} value={pack.bonus ?? 0} onChange={(e) => patchPack(index, { bonus: num(e.target.value) })} /></Field><Field label="Price ($)"><input className={fieldCls} type="number" min={0} step="0.01" value={pack.price} onChange={(e) => patchPack(index, { price: num(e.target.value) })} /></Field></div></SectionCard>)}</div>}
    </div>

    <div><div className="mb-3 flex items-center justify-between"><h2 className="text-[13px] font-semibold text-text">Lifetime Plans</h2><Button size="sm" variant="secondary" onClick={addLifetime}><Plus className="mr-1 h-3.5 w-3.5" />Add Lifetime Plan</Button></div>
      {config.lifetimes.length === 0 ? <EmptyState title="No lifetime plans" message="Add a finite-credit lifetime offer." /> : <div className="space-y-4">{config.lifetimes.map((plan, index) => <SectionCard key={plan.id} title={plan.name} subtitle={`${plan.id}${plan.archived ? ' · Archived' : ''}`} actions={<ItemActions visible={plan.visible} archived={plan.archived} index={index} count={config.lifetimes.length} onVisible={() => patchLifetime(index, { visible: !plan.visible })} onArchive={() => patchLifetime(index, { archived: !plan.archived, visible: false })} onDuplicate={() => update({ ...config, lifetimes: [...config.lifetimes, { ...plan, id: uid('lifetime'), name: `${plan.name} copy`, visible: false, archived: false, order: config.lifetimes.length }] })} onMove={(to) => update({ ...config, lifetimes: reorder(config.lifetimes, index, to) })} onRemove={() => remove('lifetime', index)} />}><div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2"><Field label="Name"><input className={fieldCls} value={plan.name} onChange={(e) => patchLifetime(index, { name: e.target.value })} /></Field><Field label="Tagline"><input className={fieldCls} value={plan.tagline} onChange={(e) => patchLifetime(index, { tagline: e.target.value })} /></Field><Field label="One-time price ($)"><input className={fieldCls} type="number" min={0} step="0.01" value={plan.price} onChange={(e) => patchLifetime(index, { price: num(e.target.value) })} /></Field><Field label="Finite lifetime credits"><input className={fieldCls} type="number" min={1} value={plan.credits} onChange={(e) => patchLifetime(index, { credits: num(e.target.value) })} /></Field><Field label="Benefits"><ListEditor items={plan.benefits} onChange={(benefits) => patchLifetime(index, { benefits })} addLabel="Add benefit" /></Field><Field label="Fair-use notes"><ListEditor items={plan.fairUse} onChange={(fairUse) => patchLifetime(index, { fairUse })} addLabel="Add note" /></Field></div></SectionCard>)}</div>}
    </div>
  </AdminPage>;
}
