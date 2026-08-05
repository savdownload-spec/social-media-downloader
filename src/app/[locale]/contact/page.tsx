'use client';
import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Send, Check, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';

export default function ContactPage() {
  const t = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err' | 'server-err'>('idle');
  const [validationError, setValidationError] = useState('');
  const { success, error: errorToast } = useToast();

  const submit = async () => {
    // Client-side validation
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setValidationError(t('contact.validation.email'));
      setState('err');
      return;
    }
    if (!form.message.trim()) {
      setValidationError(t('contact.validation.message'));
      setState('err');
      return;
    }

    setValidationError('');
    setState('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 429) {
          errorToast(t('contact.toasts.slowDown'), t('contact.toasts.tooManyRequests'));
        } else {
          errorToast(t('contact.toasts.failed'), data?.error ?? t('common.error'));
        }
        setState('server-err');
        return;
      }

      setState('ok');
      setForm({ name: '', email: '', subject: '', message: '' });
      success(t('contact.toasts.success'), t('contact.toasts.successDesc'));
    } catch {
      errorToast(t('contact.toasts.networkError'), t('contact.toasts.networkErrorDesc'));
      setState('server-err');
    }
  };

  return (
    <Container className="py-24 max-w-2xl">
      <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center mb-6">
        <Mail className="w-5 h-5 text-primary" />
      </div>
      <p className="text-sm font-medium text-primary mb-3">{t('contact.eyebrow')}</p>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        {t('contact.title')}
      </h1>
      <p className="mt-4 text-text-muted leading-relaxed">
        {t('contact.subtitle')}
      </p>

      <div className="mt-10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('contact.placeholders.name')}
          />
          <Input
            value={form.email}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); if (state === 'err') { setState('idle'); setValidationError(''); } }}
            type="email"
            placeholder={t('contact.placeholders.email')}
            required
          />
        </div>
        <Input
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          placeholder={t('contact.placeholders.subject')}
        />
        <textarea
          value={form.message}
          onChange={(e) => { setForm({ ...form, message: e.target.value }); if (state === 'err') { setState('idle'); setValidationError(''); } }}
          placeholder={t('contact.placeholders.message')}
          rows={6}
          className="w-full bg-white border border-border rounded-2xl px-5 py-3.5 text-text placeholder:text-text-subtle focus:outline-none focus:border-primary focus:shadow-glow resize-none"
          required
        />
        <Button size="lg" onClick={submit} loading={state === 'loading'} className="w-full sm:w-auto">
          {state === 'ok' ? <>{t('contact.buttons.sent')} <Check className="w-4 h-4" /></> : <>{t('contact.buttons.send')} <Send className="w-4 h-4" /></>}
        </Button>
        {state === 'err' && validationError && (
          <p className="text-sm text-red-600">{validationError}</p>
        )}
        {state === 'ok' && (
          <p className="text-sm text-accent">{t('contact.thanks')}</p>
        )}
      </div>
    </Container>
  );
}
