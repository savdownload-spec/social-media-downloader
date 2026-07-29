import Link from 'next/link';
import { Check, Sparkles, Zap, Film, Music, Wand2, Coins } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Pricing',
  description:
    'Simple, credit-based pricing for SavDown. Start free, then top up with credits for 4K, batch downloads, and upcoming AI tools.',
  path: '/pricing',
  keywords: ['savdown pricing', 'video downloader pricing', 'download credits', 'pro plan'],
});

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    credits: '30 credits / day',
    description: 'Everything you need for everyday downloads.',
    features: [
      'All 8 downloaders',
      'Up to 1080p HD',
      'No watermarks',
      'Standard download speed',
    ],
    cta: 'Get Started',
    href: '/#tools',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$9',
    period: 'per month',
    credits: '1,500 credits / month',
    description: 'For creators who download every day.',
    features: [
      'Everything in Free',
      '4K & highest quality',
      'Priority, fastest speed',
      'Batch downloads',
      'Early access to AI tools',
      'No ads, ever',
    ],
    cta: 'Join the Waitlist',
    href: '/contact',
    highlight: true,
  },
  {
    name: 'Credit Pack',
    price: '$19',
    period: 'one-time',
    credits: '3,000 credits',
    description: 'Pay once. Credits never expire.',
    features: [
      'All Pro features',
      'Credits never expire',
      'Great for occasional bulk jobs',
      'Top up any time',
    ],
    cta: 'Join the Waitlist',
    href: '/contact',
    highlight: false,
  },
];

const creditCosts = [
  { icon: Film, label: 'HD / SD video', cost: '1 credit' },
  { icon: Film, label: '4K video', cost: '2 credits' },
  { icon: Music, label: 'MP3 audio', cost: '1 credit' },
  { icon: Wand2, label: 'AI tools (soon)', cost: '3+ credits' },
];

const faqs = [
  {
    q: 'Is SavDown free right now?',
    a: 'Yes. SavDown is completely free while we build. The credit system below is a preview of our upcoming plans — nothing is charged today.',
  },
  {
    q: 'What is a credit?',
    a: 'A credit is what you spend on a single download. Most downloads cost 1 credit; 4K and future AI tools cost a little more. Your daily free credits reset every 24 hours.',
  },
  {
    q: 'Do free credits roll over?',
    a: 'Free daily credits reset each day. Credits from a Pro plan or a one-time Credit Pack do not expire.',
  },
  {
    q: 'What are the AI tools?',
    a: 'We are building smart, AI-powered features — think auto-captions, smart trimming, and format suggestions. Pro members get early access as they roll out.',
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-24 left-1/4 w-[26rem] h-[26rem] bg-indigo-brand/20 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-0 right-1/4 w-[22rem] h-[22rem] bg-fuchsia-brand/15 rounded-full blur-3xl animate-blob-slow" />
        </div>
        <Container className="relative pt-24 pb-10 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full border border-primary/15 glass shadow-soft">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-text-muted">Free today · credits coming soon</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.03em] leading-[1.03]">
            Simple, <span className="text-gradient">Credit-Based</span> Pricing.
          </h1>
          <p className="mt-5 text-lg text-text-muted leading-relaxed max-w-xl mx-auto">
            Start free and download today. When our credit system launches, you&apos;ll only pay
            for the power you actually use.
          </p>
        </Container>
      </section>

      {/* Plans */}
      <Container className="pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.highlight
                  ? 'relative rounded-3xl gradient-ring shadow-glow-lg'
                  : 'relative rounded-3xl border border-border bg-white shadow-soft'
              }
            >
              <div className={plan.highlight ? 'rounded-[23px] bg-white h-full p-8' : 'h-full p-8'}>
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-brand text-white text-xs font-semibold shadow-glow-lg">
                    Most Popular
                  </span>
                )}
                <h2 className="text-lg font-bold text-text">{plan.name}</h2>
                <div className="mt-3 flex items-end gap-1.5">
                  <span className="text-4xl font-bold tracking-tight text-text">{plan.price}</span>
                  <span className="text-sm text-text-muted mb-1">/ {plan.period}</span>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-light text-primary text-xs font-semibold">
                  <Coins className="w-3.5 h-3.5" /> {plan.credits}
                </div>
                <p className="mt-4 text-sm text-text-muted leading-relaxed">{plan.description}</p>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-text">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-accent-hover" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={
                    plan.highlight
                      ? 'mt-8 flex items-center justify-center w-full py-3 rounded-2xl text-white font-semibold bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all'
                      : 'mt-8 flex items-center justify-center w-full py-3 rounded-2xl font-semibold bg-white text-text border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-all'
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Container>

      {/* How credits work */}
      <section className="py-20">
        <Container className="max-w-4xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">How Credits Work</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">One Credit, One Download.</h2>
            <p className="mt-3 text-text-muted">Most downloads cost a single credit. Bigger jobs cost a little more.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {creditCosts.map((c) => (
              <div key={c.label} className="p-6 rounded-2xl bg-white border border-border shadow-soft text-center">
                <div className="w-11 h-11 mx-auto rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-lg">
                  <c.icon className="w-5 h-5 text-white" />
                </div>
                <div className="mt-4 text-sm font-semibold text-text">{c.label}</div>
                <div className="mt-1 text-sm text-gradient font-bold">{c.cost}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 flex items-center justify-center gap-2 text-sm text-text-muted">
            <Zap className="w-4 h-4 text-primary" />
            Every new account starts with free daily credits — no card required.
          </p>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white border-t border-border-light">
        <Container className="max-w-3xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Pricing FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Good Questions.</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group bg-white border border-border rounded-2xl overflow-hidden shadow-soft hover:border-primary/30 transition-colors [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer font-semibold text-text">
                  {f.q}
                  <span className="text-primary text-xl leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="px-6 pb-6 text-text-muted leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
