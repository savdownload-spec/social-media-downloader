'use client';
import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Send, Check, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useTranslation } from '@/i18n';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

export default function ContactPage() {
  const t = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err' | 'server-err'>('idle');
  const [validationError, setValidationError] = useState('');
  const { success, error: errorToast } = useToast();

  const submit = async () => {
    // Client-side validation
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setValidationError(t('contact.validation.email') || 'Please enter a valid email address.');
      setState('err');
      return;
    }
    if (form.message.trim().length < 3) {
      setValidationError(t('contact.validation.message') || 'Message must be at least 3 characters.');
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

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        if (res.status === 429) {
          errorToast(t('contact.toasts.slowDown') || 'Slow down', t('contact.toasts.tooManyRequests') || 'Too many requests');
        } else {
          errorToast(t('contact.toasts.failed') || 'Submission failed', data?.error ?? (t('common.error') || 'Please try again.'));
        }
        setState('server-err');
        return;
      }

      setState('ok');
      setForm({ name: '', email: '', subject: '', message: '' });
      success(t('contact.toasts.success') || 'Success', t('contact.toasts.successDesc') || 'Your message has been sent successfully.');
    } catch {
      errorToast(t('contact.toasts.networkError') || 'Network error', t('contact.toasts.networkErrorDesc') || 'Could not reach server.');
      setState('server-err');
    }
  };

  return (
    <Container className="py-24 max-w-2xl">
      <Breadcrumb
        className="mb-8"
        includeSchema
        items={[
          { label: 'Home', href: '/' },
          { label: 'Contact Us' },
        ]}
      />
      <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center mb-6">
        <Mail className="w-5 h-5 text-primary" />
      </div>
      <p className="text-sm font-medium text-primary mb-3">{t('contact.eyebrow') || 'Contact Us'}</p>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        {t('contact.title') || 'Get in touch with our team.'}
      </h1>
      <p className="mt-4 text-text-muted leading-relaxed">
        {t('contact.subtitle') || 'Have a question or feedback? We would love to hear from you.'}
      </p>

      <div className="mt-10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('contact.placeholders.name') || 'Your name'}
          />
          <Input
            value={form.email}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); if (state === 'err') { setState('idle'); setValidationError(''); } }}
            type="email"
            placeholder={t('contact.placeholders.email') || 'you@example.com'}
            required
          />
        </div>
        <Input
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          placeholder={t('contact.placeholders.subject') || 'Subject (optional)'}
        />
        <textarea
          value={form.message}
          onChange={(e) => { setForm({ ...form, message: e.target.value }); if (state === 'err') { setState('idle'); setValidationError(''); } }}
          placeholder={t('contact.placeholders.message') || 'How can we help you?'}
          rows={6}
          className="w-full bg-white dark:bg-card border border-border rounded-2xl px-5 py-3.5 text-text placeholder:text-text-subtle focus:outline-none focus:border-primary focus:shadow-glow resize-none"
          required
        />
        <Button size="lg" onClick={submit} loading={state === 'loading'} disabled={state === 'ok'} className="w-full sm:w-auto">
          {state === 'ok' ? <>{t('contact.buttons.sent') || 'Sent'} <Check className="w-4 h-4" /></> : <>{t('contact.buttons.send') || 'Send Message'} <Send className="w-4 h-4" /></>}
        </Button>
        {state === 'err' && validationError && (
          <p className="text-sm text-red-600">{validationError}</p>
        )}
        {state === 'ok' && (
          <p className="text-sm text-accent">{t('contact.thanks') || 'Thanks! Your message has been sent successfully.'}</p>
        )}
      </div>
    </Container>
  );
}


