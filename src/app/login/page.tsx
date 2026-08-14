'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

type Tab = 'signin' | 'signup' | 'forgot';

function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const { success, error: errorToast } = useToast();

  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  const switchTab = (next: Tab) => {
    setTab(next);
    setResetSent(false);
    setDevResetLink(null);
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const res = await signIn('credentials', { redirect: false, email, password });
      if (res?.error) {
        errorToast('Sign in failed', 'Invalid email or password.');
      } else if (res?.ok) {
        success('Welcome back!');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        errorToast('Registration failed', data?.error || 'Please try again.');
        return;
      }

      success('Account created!', 'You can now sign in.');
      setName('');
      setPassword('');
      setTab('signin');
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        errorToast('Request failed', data?.error || 'Please try again.');
        return;
      }

      setResetSent(true);
      // In dev without SMTP, the reset link is returned so the flow is testable.
      setDevResetLink(data?.data?.resetLink ?? null);
      success('Check your inbox', 'If an account exists for that email, a reset link has been sent.');
    } catch {
      errorToast('Network error', 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'signin', label: 'Sign In' },
    { key: 'signup', label: 'Create Account' },
    { key: 'forgot', label: 'Forgot Password' },
  ];

  return (
    <Section variant="default" className="pt-16 md:pt-20">
      <Container>
        <Breadcrumb
          className="mb-8"
          includeSchema
          items={[
            { label: 'Home', href: '/' },
            { label: 'Sign In' },
          ]}
        />
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {tab === 'signin' && 'Welcome Back'}
              {tab === 'signup' && 'Create Your Account'}
              {tab === 'forgot' && 'Forgot Password'}
            </h1>
            <p className="mt-3 text-text-muted text-sm">
              {tab === 'signin' && 'Sign in to manage your account and reviews.'}
              {tab === 'signup' && 'Register to share your SavDown experience.'}
              {tab === 'forgot' && 'We will send you a link to reset your password.'}
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-border shadow-soft p-6 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => switchTab(t.key)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    tab === t.key
                      ? 'bg-text text-white shadow-soft-md'
                      : 'bg-surface text-text-muted hover:text-text hover:bg-surface/60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === 'signin' && (
              <div className="space-y-4">
                {/* Google OAuth */}
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl })}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-2xl border border-border bg-white hover:bg-surface text-sm font-semibold text-text transition-all shadow-soft hover:shadow-soft-md"
                >
                  <GoogleIcon /> Continue with Google
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-text-subtle">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                  />
                </div>

                <Button onClick={handleSignIn} disabled={!email || !password} loading={loading} className="w-full">
                  Sign In
                </Button>
              </div>
            )}

            {tab === 'signup' && (
              <div className="space-y-4">
                {/* Google OAuth */}
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl })}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-2xl border border-border bg-white hover:bg-surface text-sm font-semibold text-text transition-all shadow-soft hover:shadow-soft-md"
                >
                  <GoogleIcon /> Sign up with Google
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-text-subtle">or create with email</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                    Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters, with a letter and a number"
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-text-subtle mt-1.5">
                    Use at least 8 characters with a letter and a number.
                  </p>
                </div>

                <Button onClick={handleSignUp} disabled={!name || !email || !password} loading={loading} className="w-full">
                  Create Account
                </Button>
              </div>
            )}

            {tab === 'forgot' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-subtle uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </div>

                {resetSent && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">
                    If an account exists for that email, a reset link has been sent.
                  </div>
                )}

                {devResetLink && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700 break-all">
                    <p className="font-semibold mb-1">Development mode (no SMTP configured):</p>
                    <Link href={devResetLink} className="underline">
                      Open reset link
                    </Link>
                  </div>
                )}

                <Button onClick={handleForgot} disabled={!email} loading={loading} className="w-full">
                  Send Reset Link
                </Button>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-text-muted mt-6">
            {tab === 'signin' && (
              <>
                No account?{' '}
                <button onClick={() => switchTab('signup')} className="text-primary font-semibold hover:underline">
                  Create one
                </button>
              </>
            )}
            {tab === 'signup' && (
              <>
                Already have an account?{' '}
                <button onClick={() => switchTab('signin')} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </Container>
    </Section>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginClient />
    </Suspense>
  );
}


