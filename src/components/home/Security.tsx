import Link from 'next/link';
import { ShieldCheck, EyeOff, ServerOff, Lock, ArrowUpRight } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';

const points = [
  {
    icon: ServerOff,
    title: 'Nothing Is Stored',
    body: 'Files stream straight through to you. We never keep a copy on our servers.',
  },
  {
    icon: EyeOff,
    title: 'No Tracking History',
    body: 'We do not build a profile of what you download or tie activity back to you.',
  },
  {
    icon: Lock,
    title: 'Encrypted Connections',
    body: 'Every request runs over HTTPS, so your links stay private in transit.',
  },
];

export function Security() {
  return (
    <Section variant="white" id="security">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Copy */}
        <Reveal>
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient mb-3 inline-block">
              Security and privacy
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              Your Links Are Yours. <span className="text-gradient">We Keep It That Way.</span>
            </h2>
            <p className="mt-4 text-text-muted leading-relaxed">
              Privacy is not a setting you have to find. SavDown is built to forget you the moment
              your download finishes. Read exactly how we handle data in our{' '}
              <Link href="/privacy" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/terms" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
                Terms
              </Link>
              .
            </p>
            <ul className="mt-8 space-y-4">
              {points.map((p) => (
                <li key={p.title} className="flex gap-4">
                  <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center text-accent-hover">
                    <p.icon className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-text">{p.title}</h3>
                    <p className="text-sm text-text-muted mt-0.5">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Visual */}
        <Reveal delay={0.1}>
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-brand opacity-15 blur-3xl rounded-[40px] pointer-events-none" />
            <div className="relative rounded-3xl bg-ink text-white p-8 md:p-10 shadow-soft-xl overflow-hidden">
              <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,black,transparent)] pointer-events-none" />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow-lg">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h3 className="mt-6 text-xl font-bold">Zero-Retention By Default</h3>
                <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                  There is no download history to leak because we never create one in the first place.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {[
                    { k: 'Files stored', v: '0' },
                    { k: 'Accounts needed', v: 'None' },
                    { k: 'Trackers on page', v: 'None' },
                    { k: 'Connection', v: 'HTTPS' },
                  ].map((m) => (
                    <div key={m.k} className="rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3">
                      <div className="text-lg font-bold text-white font-display">{m.v}</div>
                      <div className="text-xs text-ink-subtle mt-0.5">{m.k}</div>
                    </div>
                  ))}
                </div>
                <Link
                  href="/privacy"
                  className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-colors"
                >
                  How we protect your data <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
