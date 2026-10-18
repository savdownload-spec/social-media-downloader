'use client';
import { useRef, useState } from 'react';
import { Send, Check, Loader2 } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const acceptedEmail = useRef('');
  const input = useRef<HTMLInputElement>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized || normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setState('err');
      setError('Please enter a valid email address.');
      input.current?.focus();
      return;
    }
    if (!consent) {
      setState('err');
      setError('Please confirm you agree to receive the newsletter.');
      return;
    }
    if (acceptedEmail.current === normalized) { setState('ok'); return; }
    submitting.current = true;
    setState('loading');
    setError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: normalized, website, consent }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setState('err');
        setError(res.status === 429 ? 'Please wait a moment before trying again.' : "We couldn't complete your subscription right now. Please try again in a moment.");
        return;
      }
      acceptedEmail.current = normalized;
      setState('ok');
    } catch {
      setState('err');
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      submitting.current = false;
    }
  };
  return (
    <Section variant="default" className="py-14 md:py-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-brand bg-[length:200%_200%] animate-gradient text-white px-8 py-12 md:px-16 md:py-16 shadow-glow-lg">
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-fuchsia-brand/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">The Monthly Update</h2>
          <p className="mt-3 text-white leading-relaxed">One calm email a month with new tools, platform updates, creative tips, and useful ideas. No spam, ever.</p>
          <form onSubmit={submit} noValidate aria-busy={state === 'loading'} className="mt-6 flex flex-col gap-3 max-w-md mx-auto">
            {/* Email + subscribe button row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <label htmlFor="newsletter-email" className="sr-only">Email address for The Monthly Update</label>
              <input ref={input} id="newsletter-email" name="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); setState('idle'); }}
                type="email" autoComplete="email" required maxLength={254} readOnly={state === 'loading'}
                aria-invalid={state === 'err' && !!error} aria-describedby="newsletter-feedback"
                placeholder="your@email.com"
                className="flex h-11 w-full min-w-0 rounded-2xl border bg-white/10 border-white/40 px-5 py-3.5 text-white placeholder:text-white/80 focus:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all" />
              <div className="hidden" aria-hidden="true">
                <label htmlFor="newsletter-website">Website</label>
                <input id="newsletter-website" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
              </div>
              <Button type="submit" variant="secondary" disabled={state === 'loading' || state === 'ok'} className="h-11 sm:w-36 shrink-0 focus-visible:ring-white">
                {state === 'loading' ? <><Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" /> Subscribing</> : state === 'ok' ? <>Thank You <Check aria-hidden="true" className="w-4 h-4" /></> : <>Subscribe <Send aria-hidden="true" className="w-4 h-4" /></>}
              </Button>
            </div>
            {/* Consent checkbox row */}
            <div className="flex items-start gap-2.5 text-left">
              <input
                id="newsletter-consent"
                name="consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => { setConsent(e.target.checked); setError(''); setState('idle'); }}
                disabled={state === 'loading' || state === 'ok'}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/40 bg-white/10 text-primary accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent cursor-pointer"
                aria-describedby="newsletter-feedback"
              />
              <label htmlFor="newsletter-consent" className="text-sm text-white/90 leading-snug cursor-pointer select-none">
                I agree to receive the SavDown monthly newsletter and product updates.
              </label>
            </div>
          </form>
          <p id="newsletter-feedback" role="status" aria-live="polite" aria-atomic="true" className="mt-3 min-h-5 text-sm text-white max-w-md mx-auto">
            {error || (state === 'loading' ? 'Adding your request...' : state === 'ok' ? "Thanks! If your address is eligible, you're on the list. Check your inbox for any confirmation email." : '')}
          </p>
        </div>
      </div>
    </Section>
  );
}
