import Link from 'next/link';
import { ArrowRight, Check, Star, Sparkles } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { HeroToolkit } from '@/components/home/HeroToolkit';

const trustBadges = ['Free forever', 'No signup', 'Privacy-first', 'Every platform'];

const heroStats = [
  { value: '2M+', label: 'Happy users' },
  { value: '6', label: 'Platforms' },
  { value: '100%', label: 'Free' },
  { value: '4.9', label: 'Rating', star: true },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative animated backdrop */}
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_25%,black,transparent)] pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-indigo-brand/25 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-10 -right-24 w-[26rem] h-[26rem] bg-fuchsia-brand/20 rounded-full blur-3xl animate-blob-slow" />
        <div className="absolute -bottom-40 left-1/3 w-[24rem] h-[24rem] bg-primary/20 rounded-full blur-3xl animate-blob" />
      </div>

      <Container className="relative pt-20 pb-24 md:pt-28 md:pb-28">
        <div className="reveal text-center max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur border border-border text-xs font-medium text-text-muted shadow-soft">
            <span className="flex items-center gap-0.5 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-current" />
              ))}
            </span>
            Trusted by 2M+ creators
          </span>

          <h1 className="mt-6 text-4xl md:text-6xl lg:text-7xl font-bold tracking-[-0.03em] text-text leading-[1.03]">
            One Toolkit For{' '}
            <span className="text-gradient-animate">Everything You Share.</span>
          </h1>

          <p className="mt-6 text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
            Every social media tool you need, gathered into one fast, free, and private place.
            Save, convert, and grab videos, photos, and audio, with no apps and no signup.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/#tools"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all"
            >
              <Sparkles className="w-5 h-5" /> Explore All Tools
            </Link>
            <Link
              href="/#how-it-works"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold text-text bg-white border border-border hover:border-primary/40 hover:bg-primary-light/40 transition-colors"
            >
              See How It Works <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {trustBadges.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted">
                <span className="w-4 h-4 rounded-full bg-accent-light flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-accent-hover" />
                </span>
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Animated toolkit showcase */}
        <div className="reveal" style={{ animationDelay: '0.12s' }}>
          <HeroToolkit />
        </div>

        {/* Generic stat bar */}
        <div className="reveal mt-14 max-w-2xl mx-auto" style={{ animationDelay: '0.24s' }}>
          <dl className="grid grid-cols-4 rounded-2xl border border-border bg-white/60 backdrop-blur shadow-soft divide-x divide-border-light overflow-hidden">
            {heroStats.map((s) => (
              <div key={s.label} className="px-3 py-5 text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-2xl md:text-3xl font-bold tracking-tight text-gradient font-display inline-flex items-center justify-center gap-1">
                  {s.value}
                  {s.star && <Star className="w-4 h-4 text-amber-400 fill-current" />}
                </dd>
                <p className="mt-1 text-xs md:text-sm text-text-muted">{s.label}</p>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
