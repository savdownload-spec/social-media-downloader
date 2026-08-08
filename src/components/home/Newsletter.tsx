'use client';
import { useState } from 'react';
import { Send, Check } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';

export function Newsletter() {
  const t = useTranslation();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [error, setError] = useState('');
  const { success, error: errorToast, warning } = useToast();

  const submit = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError(t('contact.validation.email') || 'Please enter a valid email.');
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
          warning(t('contact.toasts.slowDown') || 'Slow down', t('contact.toasts.tooManyRequests') || 'Too many requests');
        } else {
          errorToast(t('newsletter.errorTitle') || 'Subscription failed', data?.error ?? (t('newsletter.error') || 'Please try again.'));
        }
        setState('err');
        setError(data?.error ?? (t('newsletter.error') || 'Subscription failed'));
        return;
      }
      setState('ok');
      setEmail('');
      success(t('contact.toasts.success') || 'Success', t('newsletter.success') || "You're subscribed!");
    } catch {
      errorToast(t('contact.toasts.networkError') || 'Network error', t('contact.toasts.networkErrorDesc') || 'Could not reach server.');
      setState('err');
      setError(t('newsletter.error') || 'Network error');
    }
  };

  return (
    <Section variant="default">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-brand bg-[length:200%_200%] animate-gradient text-white px-8 py-16 md:px-16 md:py-20 shadow-glow-lg">
          <div className="absolute -top-16 -right-16 w-72 h-72 bg-white/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 bg-fuchsia-brand/30 rounded-full blur-3xl pointer-events-none" />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {t('newsletter.title') || 'Get The Good Updates.'}
            </h2>
            <p className="mt-3 text-white/70 leading-relaxed">
              {t('newsletter.description') || 'One thoughtful email per month. Zero fluff. Only when we ship something worth telling you about.'}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                type="email"
                placeholder={t('newsletter.placeholder') || 'you@example.com'}
                className="flex h-11 w-full rounded-2xl border bg-white/10 border-white/20 px-5 py-3.5 text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none transition-all"
              />
              <Button
                variant="secondary"
                onClick={submit}
                loading={state === 'loading'}
                disabled={state === 'ok'}
              >
                {state === 'ok' ? (
                  <>{t('newsletter.subscribed') || 'Subscribed'} <Check className="w-4 h-4" /></>
                ) : (
                  <>{t('newsletter.button') || 'Subscribe'} <Send className="w-4 h-4" /></>
                )}
              </Button>
            </div>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
            {state === 'ok' && (
              <p className="mt-3 text-sm text-accent">{t('newsletter.success') || "You're subscribed!"}</p>
            )}
          </div>
        </div>
    </Section>
  );
}
