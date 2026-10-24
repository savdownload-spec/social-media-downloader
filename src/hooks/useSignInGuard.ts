'use client';
/**
 * useSignInGuard
 *
 * Provides a `requireAuth()` function that tool components call at the top
 * of their process/submit handlers. If the user is not authenticated:
 *   - opens the Sign In Required modal
 *   - returns false (caller should bail out immediately)
 *
 * If authenticated, returns true and the caller continues normally.
 *
 * Usage (inside any tool component):
 *   const { requireAuth, SignInModal } = useSignInGuard();
 *
 *   const process = useCallback(async () => {
 *     if (!requireAuth()) return;   // ← one line guard
 *     // ... normal processing
 *   }, [requireAuth]);
 *
 *   return <>{SignInModal}<YourToolUI /></>;
 */

import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { SignInRequiredModal } from '@/components/tools/SignInRequiredModal';
import { createElement } from 'react';

export type SignInGuard = {
  /** Call at the top of any process function. Returns true if authenticated. */
  requireAuth: () => boolean;
  /** Render this next to your tool JSX — it mounts the modal portal. */
  SignInModal: React.ReactElement;
  authLoading: boolean;
};

export function useSignInGuard(callbackUrl?: string): SignInGuard {
  const { status } = useSession();
  const [open, setOpen] = useState(false);

  const requireAuth = useCallback((): boolean => {
    // Wait for the session result instead of racing an unauthenticated API
    // request that cannot open the sign-in modal or preserve return state.
    if (status === 'authenticated') return true;
    if (status === 'loading') return false;
    setOpen(true);
    return false;
  }, [status]);

  const SignInModal = createElement(SignInRequiredModal, {
    open,
    onClose: () => setOpen(false),
    callbackUrl,
  });

  return { requireAuth, SignInModal, authLoading: status === 'loading' };
}
