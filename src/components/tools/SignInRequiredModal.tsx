'use client';
/**
 * SignInRequiredModal
 *
 * Shown when an unauthenticated user tries to use a SavDown tool.
 * Uses the existing Modal primitive and navigates to the existing login page
 * (which includes Google sign-in, email/password, and sign-up tabs).
 *
 * The callbackUrl is set to the current tool page so the user lands back
 * on the same tool after logging in — they just need to re-select/process
 * their file. We do NOT auto-submit for them; that would be surprising.
 */

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SignInRequiredModal({ open, onClose }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function handleSignIn() {
    onClose();
    // Navigate to the login page with a callbackUrl pointing back to this
    // tool so the user lands here after authenticating.
    const callbackUrl = encodeURIComponent(pathname ?? '/');
    router.push(`/login?callbackUrl=${callbackUrl}`);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-text-muted hover:text-text hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Cancel
          </button>
          <Button type="button" onClick={handleSignIn} size="md">
            Sign in
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        {/* Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>

        {/* Heading */}
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-text tracking-tight">
            Sign in to use this tool
          </h2>
          <p className="text-sm text-text-muted leading-relaxed max-w-xs mx-auto">
            Create or sign in to your SavDown account to use this tool.
          </p>
        </div>

        {/* Free credits callout */}
        <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary-light/60 px-4 py-2.5 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4 shrink-0" />
          Every account gets free daily credits
        </div>
      </div>
    </Modal>
  );
}
