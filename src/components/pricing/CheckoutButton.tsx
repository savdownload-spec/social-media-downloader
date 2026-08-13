'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type Props = {
  /** Catalogue id from `@/lib/billing` — the server resolves the real price. */
  item: string;
  label: string;
  className: string;
};

/**
 * Starts Stripe Checkout for one catalogue item.
 *
 * Signed-out visitors are sent to log in first and returned to /pricing, since
 * a purchase has to attach to an account for its credits to land anywhere.
 */
export function CheckoutButton({ item, label, className }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    if (status === 'unauthenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent('/pricing')}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item }),
      });
      const payload = await res.json();

      if (!res.ok || !payload?.ok) {
        toast.error(payload?.error || 'Could not start checkout. Please try again.');
        setLoading(false);
        return;
      }

      // Full navigation, not the router: this leaves the app for Stripe.
      window.location.assign(payload.data.url);
    } catch {
      toast.error('Could not reach the payment service. Please try again.');
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startCheckout}
      disabled={loading || status === 'loading'}
      className={`${className} disabled:opacity-70 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          Redirecting…
        </>
      ) : (
        label
      )}
    </button>
  );
}
