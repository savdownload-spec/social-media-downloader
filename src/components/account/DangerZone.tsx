'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { useToast } from '@/components/ui/Toast';

export function DangerZone({ email }: { email: string }) {
  const [deleting, setDeleting] = useState(false);
  const { confirm } = useConfirm();
  const { error: errorToast } = useToast();

  async function handleDeleteAccount() {
    const confirmed = await confirm({
      title: 'Delete your account?',
      description:
        'This permanently deletes your profile and every review you have submitted. This cannot be undone.',
      confirmLabel: 'Delete account',
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        errorToast('Delete failed', data?.error || 'Please try again.');
        setDeleting(false);
        return;
      }

      await signOut({ callbackUrl: '/' });
    } catch {
      errorToast('Network error', 'Could not reach the server.');
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-border shadow-soft p-6">
      <h2 className="text-lg font-bold text-text mb-1">Account</h2>
      <p className="text-sm text-text-muted mb-5 truncate">{email}</p>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-text-muted bg-surface hover:bg-surface/70 hover:text-text transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>

      <div className="mt-6 pt-6 border-t border-border-light">
        <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-2">Danger Zone</p>
        <p className="text-xs text-text-muted mb-3">
          Deleting your account removes your profile and reviews permanently.
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {deleting ? 'Deleting…' : 'Delete Account'}
        </button>
      </div>
    </div>
  );
}
