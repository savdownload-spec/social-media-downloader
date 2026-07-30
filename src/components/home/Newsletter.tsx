'use client';
import { useState } from 'react';
import { Send, Check } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email.');
      return;
    }
    setState('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('failed');
      setState('ok');
      setEmail('');
    } catch {
      setState('err');
      setError('Something went wrong. Try again.');
    }
  };

  return (
    <Section variant="default">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand bg-[length:200%_200%] animate-gradient text-white px-8 py-16 md:px-16 md:py-20 shadow-glow-lg">
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-fuchsia-brand/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Get The Good Updates.
            </h2>
            <p className="mt-3 text-white/70 leading-relaxed">
              One thoughtful email per month. Zero fluff. Only when we ship something worth telling you about.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                type="email"
                placeholder="you@example.com"
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-white/40"
              />
              <Button
                variant="secondary"
                onClick={submit}
                loading={state === 'loading'}
                disabled={state === 'ok'}
              >
                {state === 'ok' ? (
                  <>Subscribed <Check className="w-4 h-4" /></>
                ) : (
                  <>Subscribe <Send className="w-4 h-4" /></>
                )}
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
            {state === 'ok' && (
              <p className="mt-3 text-sm text-accent">You're on the list. Talk soon.</p>
            )}
          </div>
        </div>
    </Section>
  );
}
