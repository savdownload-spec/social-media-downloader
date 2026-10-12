'use client';
import { useState } from 'react';
import { Send, Check } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function Newsletter() {  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [error, setError] = useState('');
  const { success, error: errorToast, warning } = useToast();

  const submit = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Please enter a valid email address.");
      return;
    }
    setState('loading');
    setError('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        if (res.status === 429) {
          warning("Slow down!", "Too many requests, please wait a moment.");
        } else {
          errorToast("Oops!", data?.error ?? ("Something went wrong. Please try again."));
        }
        setState('err');
        setError(data?.error ?? ("Something went wrong. Please try again."));
        return;
      }
      setState('ok');
      setEmail('');
      success("Message sent!", "Check your inbox to confirm!");
    } catch {
      errorToast("Network error", "Could not reach the server. Check your connection and try again.");
      setState('err');
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <Section variant="default">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand bg-[length:200%_200%] animate-gradient text-white px-8 py-16 md:px-16 md:py-20 shadow-glow-lg">
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-fuchsia-brand/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {"The Monthly Update"}
            </h2>
            <p className="mt-3 text-white/70 leading-relaxed">
              {"One calm email a month with new tools, platform updates, creative tips, and useful ideas. No spam, ever."}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                type="email"
                placeholder={"your@email.com"}
                className="flex h-11 w-full rounded-2xl border bg-white/10 border-white/20 px-5 py-3.5 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none transition-all"
              />
              <Button
                variant="secondary"
                onClick={submit}
                loading={state === 'loading'}
                disabled={state === 'ok'}
              >
                {state === 'ok' ? (
                  <>{"You're subscribed"} <Check className="w-4 h-4" /></>
                ) : (
                  <>{"Subscribe"} <Send className="w-4 h-4" /></>
                )}
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
            {state === 'ok' && (
              <p className="mt-3 text-sm text-accent">{"Check your inbox to confirm!"}</p>
            )}
          </div>
        </div>
    </Section>
  );
}
