'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { useToast } from '@/components/ui/Toast';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

type PasswordFieldProps = { label: string; value: string; placeholder: string; autoComplete: string; onChange: (value: string) => void };

function PasswordField({ label, value, placeholder, autoComplete, onChange }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const inputId = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-text">{label}</label>
      <div className="relative">
        <Input id={inputId} type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} className="pr-12" required />
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-2xl text-text-subtle transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

type Tab = 'signin' | 'signup' | 'forgot';

function getSafeDestination(callbackUrl: string | null) {
  if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) return callbackUrl;
  return '/account';
}

function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const callbackUrl = getSafeDestination(searchParams.get('callbackUrl'));
  const { success, error: errorToast } = useToast();
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) router.replace(callbackUrl);
  }, [callbackUrl, router, session, status]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setAuthError(null);
    setResetSent(false);
    setDevResetLink(null);
  };

  const showError = (title: string, message: string) => {
    setAuthError(message);
    errorToast(title, message);
  };

  const handleGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const result = await signIn('google', { callbackUrl });
      if (result?.error) {
        const message = result.error === 'OAuthAccountNotLinked' ? 'This email is already connected to another sign-in method. Try email and password instead.' : 'Google sign-in could not be completed. Please try again.';
        showError('Google sign-in failed', message);
      }
    } catch {
      showError('Network error', 'We could not reach the sign-in service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    if (!email.trim() || !email.includes('@')) return showError('Check your email', 'Enter a valid email address to continue.');
    if (!password) return showError('Password required', 'Enter your password to continue.');
    setLoading(true);
    try {
      const result = await signIn('credentials', { redirect: false, email: email.trim(), password, callbackUrl });
      if (result?.error) showError('Sign in failed', 'We could not sign you in. Check your email and password and try again.');
      else if (result?.ok) { success('Welcome back!', 'Taking you to your account.'); router.replace(callbackUrl); router.refresh(); }
      else showError('Sign in failed', 'We could not complete sign in. Please try again.');
    } catch { showError('Network error', 'We could not reach the server. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    if (name.trim().length < 2) return showError('Name required', 'Enter your name so we can create your account.');
    if (!email.trim() || !email.includes('@')) return showError('Check your email', 'Enter a valid email address to continue.');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return showError('Password needs an update', 'Use at least 8 characters with a letter and a number.');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.trim(), password }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        if (response.status === 409) showError('Account already exists', 'This email is already registered. Sign in or use Google instead.');
        else showError('Registration failed', 'We could not create your account. Check your details and try again.');
        return;
      }
      success('Account created!', 'Sign in with your new email and password.');
      setName(''); setPassword(''); setTab('signin');
    } catch { showError('Network error', 'We could not reach the server. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleForgot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    if (!email.trim() || !email.includes('@')) return showError('Check your email', 'Enter a valid email address to receive a reset link.');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) { showError('Request failed', 'We could not start the reset flow. Please try again.'); return; }
      setResetSent(true); setDevResetLink(data?.data?.resetLink ?? null);
      success('Check your inbox', 'If an account exists for that email, a reset link has been sent.');
    } catch { showError('Network error', 'We could not reach the server. Please try again.'); }
    finally { setLoading(false); }
  };

  if (status === 'loading' || (status === 'authenticated' && session?.user)) {
    return <Section variant="white" className="py-16"><Container><div className="mx-auto max-w-md rounded-[28px] border border-border/70 bg-white/90 dark:bg-card/90 px-6 py-16 text-center shadow-soft"><div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary"><LockKeyhole className="h-5 w-5" /></div><p className="text-sm font-semibold text-text">Checking your account</p><p className="mt-2 text-sm text-text-muted">Just a moment while we prepare your account.</p></div></Container></Section>;
  }

  const isSignIn = tab === 'signin';
  const isSignUp = tab === 'signup';
  const isForgot = tab === 'forgot';

  return (
    <Section variant="white" className="relative overflow-hidden bg-[#fcfbff] dark:bg-background py-12 text-[#0f0b1e] dark:text-text md:py-20">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden"><div className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" /><div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" /><div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_right,rgba(96,57,196,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(96,57,196,0.04)_1px,transparent_1px)] bg-[size:34px_34px] [mask-image:linear-gradient(to_bottom,black,transparent)]" /></div>
      <Container>
        <div className="relative mx-auto max-w-[456px]">
          <div className="mb-8 text-center"><div className="flex items-center justify-center transition-transform hover:scale-[1.02]"><Logo height={40} /></div><div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary-light/60 px-3 py-1.5 text-xs font-semibold text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Secure member access</div><h1 className="mt-5 text-3xl font-bold tracking-tight text-text md:text-4xl">{isSignIn && 'Welcome back'}{isSignUp && 'Create your account'}{isForgot && 'Reset your password'}</h1><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-text-muted">{isSignIn && 'Sign in to access your account, reviews and SavDown features.'}{isSignUp && 'Join SavDown to keep your account, reviews and saved features in one place.'}{isForgot && 'Enter your email and we will help you get back into your account.'}</p></div>
          <div className="rounded-[28px] border border-border/70 bg-white/95 dark:bg-card/95 p-5 shadow-[0_24px_70px_-32px_rgba(43,25,91,0.45)] backdrop-blur sm:p-8"><div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{isForgot ? 'Account recovery' : 'Account access'}</p><p className="mt-1 text-sm text-text-muted">Fast, private and built for SavDown.</p></div><div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface text-primary sm:flex"><LockKeyhole className="h-4 w-4" /></div></div>
            {authError && <div role="alert" className="mb-5 rounded-2xl border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-sm leading-5 text-rose-700 dark:text-rose-400">{authError}</div>}
            {isSignIn && <><button type="button" onClick={handleGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-white dark:bg-card px-4 py-3.5 text-sm font-semibold text-text shadow-[0_5px_16px_-10px_rgba(18,12,43,0.35)] transition-all hover:border-primary/30 hover:bg-surface hover:shadow-soft active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"><GoogleIcon /> Continue with Google</button><Divider label="or continue with email" /><form className="space-y-5" onSubmit={handleSignIn}><div><label htmlFor="signin-email" className="mb-2 block text-sm font-semibold text-text">Email</label><Input id="signin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div><PasswordField label="Password" value={password} onChange={setPassword} placeholder="Enter your password" autoComplete="current-password" /><div className="flex items-center justify-end"><button type="button" onClick={() => switchTab('forgot')} className="text-sm font-semibold text-primary transition-colors hover:text-primary/75 hover:underline">Forgot password?</button></div><Button type="submit" size="lg" disabled={!email || !password} loading={loading} className="w-full">Sign In <ArrowRight className="h-4 w-4" /></Button></form><p className="mt-6 text-center text-sm text-text-muted">Don&apos;t have an account? <button type="button" onClick={() => switchTab('signup')} className="font-semibold text-primary hover:underline">Create Account</button></p></>}
            {isSignUp && <><button type="button" onClick={handleGoogle} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-white dark:bg-card px-4 py-3.5 text-sm font-semibold text-text shadow-[0_5px_16px_-10px_rgba(18,12,43,0.35)] transition-all hover:border-primary/30 hover:bg-surface hover:shadow-soft active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60"><GoogleIcon /> Continue with Google</button><Divider label="or create with email" /><form className="space-y-5" onSubmit={handleSignUp}><div><label htmlFor="signup-name" className="mb-2 block text-sm font-semibold text-text">Name</label><Input id="signup-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required /></div><div><label htmlFor="signup-email" className="mb-2 block text-sm font-semibold text-text">Email</label><Input id="signup-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div><PasswordField label="Password" value={password} onChange={setPassword} placeholder="At least 8 characters" autoComplete="new-password" /><p className="-mt-2 text-xs leading-5 text-text-subtle">Use at least 8 characters with a letter and a number.</p><Button type="submit" size="lg" disabled={!name || !email || !password} loading={loading} className="w-full">Create Account <ArrowRight className="h-4 w-4" /></Button></form><p className="mt-6 text-center text-sm text-text-muted">Already have an account? <button type="button" onClick={() => switchTab('signin')} className="font-semibold text-primary hover:underline">Sign In</button></p></>}
            {isForgot && <><>{resetSent ? <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-700 dark:text-emerald-400"><p className="font-semibold text-emerald-800 dark:text-emerald-300">Check your inbox</p><p className="mt-1">If an account exists for that email, we sent a password reset link.</p>{devResetLink && <Link href={devResetLink} className="mt-3 inline-flex font-semibold underline underline-offset-2">Open reset link</Link>}</div> : <form className="space-y-5" onSubmit={handleForgot}><div><label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold text-text">Email</label><Input id="forgot-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></div><Button type="submit" size="lg" disabled={!email} loading={loading} className="w-full">Send Reset Link <ArrowRight className="h-4 w-4" /></Button></form>}</><button type="button" onClick={() => switchTab('signin')} className="mx-auto mt-6 flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft className="h-4 w-4" /> Back to Sign In</button></>}
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-text-subtle">By continuing, you agree to use SavDown responsibly. Your account details stay protected with secure authentication.</p>
        </div>
      </Container>
    </Section>
  );
}

function Divider({ label }: { label: string }) {
  return <div className="my-6 flex items-center gap-3" aria-hidden="true"><div className="h-px flex-1 bg-border" /><span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-subtle">{label}</span><div className="h-px flex-1 bg-border" /></div>;
}

export default function LoginPage() {
  return <Suspense><LoginClient /></Suspense>;
}
