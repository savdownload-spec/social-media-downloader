'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

type AffiliateStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
type Affiliate = { code: string; status: AffiliateStatus; createdAt: string };

/**
 * The single "join the program" surface, used in the hero and the closing
 * CTA. Genuinely wired to `/api/affiliates` — no fake stats, no simulated
 * approval. Signed-out visitors are sent to sign in first; signed-in
 * visitors apply and see their real, current application status.
 */
export function AffiliateApplyPanel({ variant = 'primary' }: { variant?: 'primary' | 'panel' }) {
  const { data: session, status: authStatus } = useSession();
  const { error: errorToast } = useToast();
  const [affiliate, setAffiliate] = useState<Affiliate | null | undefined>(undefined);
  const [applying, setApplying] = useState(false);

  const loadStatus = useCallback(async () => {
    if (authStatus !== 'authenticated') return;
    try {
      const res = await fetch('/api/affiliates');
      const data = await res.json().catch(() => null);
      setAffiliate(res.ok && data?.ok ? data.data.affiliate : null);
    } catch {
      setAffiliate(null);
    }
  }, [authStatus]);

  useEffect(() => {
    if (authStatus === 'authenticated') loadStatus();
  }, [authStatus, loadStatus]);

  async function apply() {
    setApplying(true);
    try {
      const res = await fetch('/api/affiliates', { method: 'POST' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        errorToast('Application failed', data?.error ?? 'Please try again.');
        return;
      }
      setAffiliate(data.data.affiliate);
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setApplying(false);
    }
  }

  const buttonSize = variant === 'panel' ? 'lg' : 'lg';

  if (authStatus !== 'authenticated') {
    return (
      <Link href="/login?callbackUrl=%2Faffiliates">
        <Button size={buttonSize} variant={variant === 'panel' ? 'secondary' : 'primary'}>
          Join the Affiliate Program <ArrowRight className="h-4 w-4" />
        </Button>
      </Link>
    );
  }

  if (affiliate === undefined) {
    return (
      <Button size={buttonSize} variant={variant === 'panel' ? 'secondary' : 'primary'} disabled loading>
        Join the Affiliate Program
      </Button>
    );
  }

  if (affiliate?.status === 'ACTIVE') {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 px-5 py-3.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        You&apos;re an active affiliate — check your account for your referral link.
      </div>
    );
  }

  if (affiliate?.status === 'PENDING') {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary-light px-5 py-3.5 text-sm font-semibold text-primary">
        <Clock className="h-4 w-4 flex-shrink-0" />
        Application submitted — we&apos;ll review it soon.
      </div>
    );
  }

  if (affiliate?.status === 'SUSPENDED') {
    return (
      <p className="text-sm font-medium text-text-muted">
        Your affiliate account is currently suspended. Contact{' '}
        <Link href="/contact" className="font-semibold text-primary hover:text-primary-hover underline underline-offset-4">
          support
        </Link>{' '}
        for details.
      </p>
    );
  }

  return (
    <Button
      size={buttonSize}
      variant={variant === 'panel' ? 'secondary' : 'primary'}
      onClick={apply}
      loading={applying}
    >
      Join the Affiliate Program <ArrowRight className="h-4 w-4" />
    </Button>
  );
}
