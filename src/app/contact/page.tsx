'use client';
import { useState } from 'react';
import { Container } from '@/components/layout/Container';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Send, Check, Mail } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');

  const submit = async () => {
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) || !form.message) {
      setState('err');
      return;
    }
    setState('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('failed');
      setState('ok');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch {
      setState('err');
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
        Feedback, feature requests, bug reports, partnerships — we read every message.
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
            onChange={(e) => setForm({ ...form, email: e.target.value })}
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
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="What's on your mind?"
          rows={6}
          className="w-full bg-white border border-border rounded-2xl px-5 py-3.5 text-text placeholder:text-text-subtle focus:outline-none focus:border-primary focus:shadow-glow resize-none"
          required
        />
        <Button size="lg" onClick={submit} loading={state === 'loading'} className="w-full sm:w-auto">
          {state === 'ok' ? <>Message sent <Check className="w-4 h-4" /></> : <>Send message <Send className="w-4 h-4" /></>}
        </Button>
        {state === 'err' && (
          <p className="text-sm text-red-600">Please fill in email and message.</p>
        )}
        {state === 'ok' && (
          <p className="text-sm text-accent">Thanks — we'll get back to you soon.</p>
        )}
      </div>
    </Container>
  );
}
