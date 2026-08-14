'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { success, error: errorToast } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = token && password.length >= 8 && password === confirm;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (password !== confirm) errorToast('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        errorToast('Reset failed', data?.error || 'Please try again.');
        return;
      }

      success('Password updated!', 'You can now sign in with your new password.');
      setDone(true);
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Section variant="default" className="pt-16 md:pt-20">
        <Container>
          <Breadcrumb
            className="mb-8"
            includeSchema
            items={[
              { label: 'Home', href: '/' },
              { label: 'Reset Password' },
            ]}
          />
          <div className="max-w-md mx-auto text-center">
            <div className="rounded-2xl bg-white border border-border shadow-soft p-8">
              <h1 className="text-2xl font-bold tracking-tight mb-3">Password Updated</h1>
              <p className="text-sm text-text-muted mb-6">
                Your password has been changed. You can now sign in with your new password.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 rounded-2xl text-sm font-semibold text-white bg-gradient-brand shadow-glow-lg"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section variant="default" className="pt-16 md:pt-20">
      <Container>
          <Breadcrumb
            className="mb-8"
            includeSchema
            items={[
              { label: 'Home', href: '/' },
              { label: 'Reset Password' },
            ]}
          />
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Choose a New Password</h1>
            <p className="mt-3 text-text-muted text-sm">
              Enter a new password for your account.
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-border shadow-soft p-6 md:p-8">
            {!token ? (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
                This reset link is invalid or has expired. Please request a new one.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters, with a letter and a number"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                  />
                  {password !== confirm && confirm.length > 0 && (
                    <p className="text-xs text-rose-600 mt-1.5">Passwords do not match.</p>
                  )}
                </div>

                <Button onClick={handleSubmit} disabled={!canSubmit} loading={loading} className="w-full">
                  Reset Password
                </Button>
              </div>
            )}

            {!token && (
              <div className="mt-4 text-center">
                <Link href="/login" className="text-sm text-primary font-semibold hover:underline">
                  Back to sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordClient />
    </Suspense>
  );
}

