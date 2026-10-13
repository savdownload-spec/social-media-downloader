import type { Metadata } from 'next';
import { Clock3, ShieldCheck, Wrench } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Under Maintenance | SavDown',
  description: 'SavDown is temporarily unavailable while scheduled maintenance is completed.',
  robots: { index: false, follow: false, nocache: true },
};

export default function MaintenancePage() {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-surface px-5 py-12 sm:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top,rgb(var(--primary)/0.14),transparent_68%)]"
      />

      <main className="w-full max-w-2xl text-center">
        <div className="mb-10 flex justify-center">
          <Logo linked={false} height={36} />
        </div>

        <section className="rounded-3xl border border-border bg-card px-6 py-10 shadow-soft-lg sm:px-12 sm:py-14">
          <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/15 bg-primary-light text-primary">
            <Wrench className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
          </div>

          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Scheduled maintenance
          </p>
          <h1 className="type-page-title text-text">Under Maintenance</h1>
          <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-text-muted sm:text-lg">
            SavDown is currently undergoing scheduled maintenance. We&apos;re making a few improvements and will be back shortly.
          </p>

          <div className="mt-9 grid gap-3 text-left sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface/70 px-4 py-3.5">
              <Clock3 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-text">Temporary interruption</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border-light bg-surface/70 px-4 py-3.5">
              <ShieldCheck className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
              <span className="text-sm font-medium text-text">Your account remains secure</span>
            </div>
          </div>
        </section>

        <p className="mt-7 text-sm text-text-muted">
          Thank you for your patience.
        </p>
      </main>
    </div>
  );
}
