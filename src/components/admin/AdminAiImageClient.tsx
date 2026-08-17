'use client';

import { useState, useEffect } from 'react';
import { AdminPage, PageHeader, SectionCard, ErrorState, Skeleton } from './AdminUI';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Save } from 'lucide-react';
import type { AiImageConfig } from '@/config/aiImage';

const fieldCls =
  'w-full h-8 rounded-lg border border-border-light px-2.5 text-[13px] text-text bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all';
const labelCls = 'block text-[11px] font-medium text-text-muted mb-1';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-text-subtle">{hint}</p>}
    </div>
  );
}

export function AdminAiImageClient() {
  const [config, setConfig] = useState<AiImageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error: err } = useToast();

  useEffect(() => {
    fetch('/api/admin/ai-image')
      .then((r) => r.json())
      .then((d) => { if (d.ok) setConfig(d.data); else setError(true); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    const res = await fetch('/api/admin/ai-image', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) success('AI Image Generator settings saved.');
    else err('Save failed', d?.error);
    setSaving(false);
  }

  function patch(next: Partial<AiImageConfig>) {
    if (!config) return;
    setConfig({ ...config, ...next });
  }

  const num = (v: string) => (v === '' ? 0 : parseFloat(v));

  if (error) return <AdminPage><PageHeader title="AI Image Generator" /><ErrorState message="Failed to load AI Image Generator settings." /></AdminPage>;

  if (loading || !config) {
    return (
      <AdminPage>
        <PageHeader title="AI Image Generator" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <PageHeader
        title="AI Image Generator"
        description="Configure models, cost, and limits for the AI Image Generator (Cloudflare Workers AI). Use the Tools page to enable/disable/maintenance the tool itself. Provider credentials are set via server environment variables and are never shown here."
        actions={
          <Button onClick={save} loading={saving} size="sm">
            <Save className="h-3.5 w-3.5 mr-1.5" /> Save Changes
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Models" subtitle="Cloudflare Workers AI model identifiers per quality tier.">
          <div className="space-y-3">
            <Field label="Standard quality model" hint="Fast, distilled model (fixed step count).">
              <input className={fieldCls} value={config.standardModel} onChange={(e) => patch({ standardModel: e.target.value })} />
            </Field>
            <Field label="High quality model" hint="Full model, better photorealism, slower/costlier.">
              <input className={fieldCls} value={config.highModel} onChange={(e) => patch({ highModel: e.target.value })} />
            </Field>
            <Field label="High quality diffusion steps" hint="10–50. Higher = better detail, slower, costlier.">
              <input type="number" min={10} max={50} className={fieldCls} value={config.highModelSteps} onChange={(e) => patch({ highModelSteps: Math.round(num(e.target.value)) })} />
            </Field>
            <Field label="Maintenance message" hint="Shown when the tool is temporarily unavailable.">
              <input className={fieldCls} value={config.maintenanceMessage} onChange={(e) => patch({ maintenanceMessage: e.target.value })} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Credit cost" subtitle="How many SavCredits a generation costs.">
          <div className="space-y-3">
            <Field label="Base cost (standard quality, 1 image)">
              <input type="number" min={1} className={fieldCls} value={config.creditCostStandard} onChange={(e) => patch({ creditCostStandard: Math.round(num(e.target.value)) })} />
            </Field>
            <Field label="High quality multiplier" hint="Applied on top of the base cost, e.g. 1.4 = +40%.">
              <input type="number" step="0.1" min={1} className={fieldCls} value={config.highQualityMultiplier} onChange={(e) => patch({ highQualityMultiplier: num(e.target.value) })} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Free user limits" subtitle="Applies to accounts on the FREE plan.">
          <div className="space-y-3">
            <Field label="Free generations per day">
              <input type="number" min={0} className={fieldCls} value={config.freeDailyLimit} onChange={(e) => patch({ freeDailyLimit: Math.round(num(e.target.value)) })} />
            </Field>
            <Field label="Max images per request (free)">
              <input type="number" min={1} max={4} className={fieldCls} value={config.maxImagesPerRequestFree} onChange={(e) => patch({ maxImagesPerRequestFree: Math.round(num(e.target.value)) })} />
            </Field>
            <Field label="Max images per request (paid plans)">
              <input type="number" min={1} max={4} className={fieldCls} value={config.maxImagesPerRequestPro} onChange={(e) => patch({ maxImagesPerRequestPro: Math.round(num(e.target.value)) })} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Rate limits & timeouts" subtitle="Protects the provider and the site under concurrent load.">
          <div className="space-y-3">
            <Field label="Requests per IP per minute">
              <input type="number" min={1} className={fieldCls} value={config.rateLimitPerIpPerMinute} onChange={(e) => patch({ rateLimitPerIpPerMinute: Math.round(num(e.target.value)) })} />
            </Field>
            <Field label="Max prompt length (characters)">
              <input type="number" min={3} className={fieldCls} value={config.maxPromptLength} onChange={(e) => patch({ maxPromptLength: Math.round(num(e.target.value)) })} />
            </Field>
            <Field label="Generation timeout (ms)">
              <input type="number" min={5000} className={fieldCls} value={config.timeoutMs} onChange={(e) => patch({ timeoutMs: Math.round(num(e.target.value)) })} />
            </Field>
            <Field label="Max concurrent jobs (per instance)">
              <input type="number" min={1} className={fieldCls} value={config.maxConcurrentJobs} onChange={(e) => patch({ maxConcurrentJobs: Math.round(num(e.target.value)) })} />
            </Field>
            <Field label="Max queue size (per instance)">
              <input type="number" min={1} className={fieldCls} value={config.maxQueueSize} onChange={(e) => patch({ maxQueueSize: Math.round(num(e.target.value)) })} />
            </Field>
          </div>
        </SectionCard>
      </div>
    </AdminPage>
  );
}
