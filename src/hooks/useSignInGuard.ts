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
};

export function useSignInGuard(): SignInGuard {
  const { status } = useSession();
  const [open, setOpen] = useState(false);

  const requireAuth = useCallback((): boolean => {
    // 'loading' — session is still resolving. Optimistically allow the
    // server call; if truly unauthenticated, the API returns 401 and
    // the normal error path handles it.
    if (status === 'authenticated' || status === 'loading') return true;
    setOpen(true);
    return false;
  }, [status]);

  const SignInModal = createElement(SignInRequiredModal, {
    open,
    onClose: () => setOpen(false),
  });

  return { requireAuth, SignInModal };
}
