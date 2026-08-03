'use client';
import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Send, Check, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err' | 'server-err'>('idle');
  const [validationError, setValidationError] = useState('');
  const { success, error: errorToast } = useToast();

  const submit = async () => {
    // Client-side validation
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setValidationError('Please enter a valid email address.');
      setState('err');
      return;
    }
    if (!form.message.trim()) {
      setValidationError('Please write a message before sending.');
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
          errorToast('Slow down!', 'Too many requests — please wait a moment.');
        } else {
          errorToast('Send failed', data?.error ?? 'Something went wrong on our end. Please try again.');
        }
        setState('server-err');
        return;
      }

      setState('ok');
      setForm({ name: '', email: '', subject: '', message: '' });
      success('Message sent!', 'We\'ll get back to you as soon as possible.');
    } catch {
      errorToast('Network error', 'Could not reach the server. Check your connection and try again.');
      setState('server-err');
    }
  };

  return (
    <Container className="py-24 max-w-2xl">
      <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center mb-6">
        <Mail className="w-5 h-5 text-primary" />
      </div>
      <p className="text-sm font-medium text-primary mb-3">Contact</p>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        Say Hello.
      </h1>
      <p className="mt-4 text-text-muted leading-relaxed">
        Feedback, feature requests, bug reports, partnerships, we read every message.
      </p>

      <div className="mt-10 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
          />
          <Input
            value={form.email}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); if (state === 'err') { setState('idle'); setValidationError(''); } }}
            type="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <Input
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          placeholder="Subject"
        />
        <textarea
          value={form.message}
          onChange={(e) => { setForm({ ...form, message: e.target.value }); if (state === 'err') { setState('idle'); setValidationError(''); } }}
          placeholder="What's on your mind?"
          rows={6}
          className="w-full bg-white border border-border rounded-2xl px-5 py-3.5 text-text placeholder:text-text-subtle focus:outline-none focus:border-primary focus:shadow-glow resize-none"
          required
        />
        <Button size="lg" onClick={submit} loading={state === 'loading'} className="w-full sm:w-auto">
          {state === 'ok' ? <>Message sent <Check className="w-4 h-4" /></> : <>Send message <Send className="w-4 h-4" /></>}
        </Button>
        {state === 'err' && validationError && (
          <p className="text-sm text-red-600">{validationError}</p>
        )}
        {state === 'ok' && (
          <p className="text-sm text-accent">Thanks, we'll get back to you soon.</p>
        )}
      </div>
    </Container>
  );
}
