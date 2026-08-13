'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

/**
 * Sends the user to the Stripe billing portal, where they can change their
 * card, download invoices and cancel.
 */
export function ManageBillingButton() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const payload = await res.json();

      if (!res.ok || !payload?.ok) {
        toast.error(payload?.error || 'Could not open the billing portal.');
        setLoading(false);
        return;
      }

      window.location.assign(payload.data.url);
    } catch {
      toast.error('Could not reach the billing service. Please try again.');
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openPortal}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-5 py-2.5 text-sm font-semibold text-text transition-all hover:border-primary/40 hover:bg-primary-light/40 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Opening…
        </>
      ) : (
        'Manage billing'
      )}
    </button>
  );
}
