import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from './Container';
import { Section } from './Section';
import { Reveal } from '@/components/ui/Reveal';

type InfoPageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  /** Optional small badge under the title (e.g. "Last updated: ...") */
  meta?: ReactNode;
  /** Hero highlight chips — small pills rendered under the description. */
  highlights?: { icon?: ReactNode; label: string }[];
};

/**
 * Shared "premium info page" hero. Mirrors the homepage's premium feel
 * (gradient text, blurred orbs, dotted grid) so legal/company pages
 * feel like a first-class part of the product, not a footnote.
 */
export function InfoPageHero({
  eyebrow,
  title,
  description,
  meta,
  highlights,
}: InfoPageHeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_70%_60%_at_50%_15%,black,transparent)] pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 -left-16 w-[26rem] h-[26rem] bg-indigo-brand/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute -top-10 right-0 w-[22rem] h-[22rem] bg-fuchsia-brand/15 rounded-full blur-3xl animate-blob-slow" />
      </div>

      <Container className="relative pt-16 pb-12 md:pt-20 md:pb-16 text-center max-w-3xl">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
            {eyebrow}
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-[-0.03em] text-text leading-[1.05]">
            {title}
          </h1>
          <p className="mt-5 text-lg text-text-muted leading-relaxed">
            {description}
          </p>
          {meta && <div className="mt-4 text-sm text-text-subtle">{meta}</div>}
          {highlights && highlights.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              {highlights.map((h, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-border-light text-sm font-medium text-text-muted shadow-soft"
                >
                  {h.icon}
                  {h.label}
                </span>
              ))}
            </div>
          )}
        </Reveal>
      </Container>
    </section>
  );
}

type InfoBlockProps = {
  /** Lucide icon component */
  icon: ReactNode;
  /** Gradient tile class, e.g. "bg-amber-50 text-amber-600" */
  tile: string;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
};

/**
 * A "feature card" used in info pages — the icon tile, title, and content
 * slot keep a consistent shape across About, Privacy, Terms, DMCA, and Cookies.
 */
export function InfoBlock({ icon, tile, title, description, children }: InfoBlockProps) {
  return (
    <div className="h-full bg-white border border-border-light p-6 md:p-7 rounded-2xl shadow-soft hover:shadow-soft-md hover:border-primary/20 transition-all">
      <div className="flex items-start gap-4">
        <span className={`shrink-0 w-12 h-12 rounded-2xl ${tile} flex items-center justify-center`}>
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-text tracking-tight">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-text-muted leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

type InfoBlockGridProps = {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
};

export function InfoBlockGrid({ children, cols = 3, className }: InfoBlockGridProps) {
  const colClass = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }[cols];
  return <div className={`grid ${colClass} gap-5 ${className ?? ''}`}>{children}</div>;
}

type InfoCalloutProps = {
  title: string;
  body: ReactNode;
  cta?: { label: string; href: string };
};

/** Highlighted callout used to drive the reader to the next step. */
export function InfoCallout({ title, body, cta }: InfoCalloutProps) {
  return (
    <Container className="pb-16">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-brand text-white p-8 md:p-10 shadow-glow-lg">
        <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)] pointer-events-none opacity-50" />
        <div className="relative max-w-2xl">
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h3>
          <p className="mt-3 text-white/85 leading-relaxed">{body}</p>
          {cta && (
            <Link
              href={cta.href}
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-text font-semibold shadow-soft-md hover:shadow-soft-lg transition-all"
            >
              {cta.label}
            </Link>
          )}
        </div>
      </div>
    </Container>
  );
}

type InfoCtaLinkProps = {
  text: string;
  href: string;
};

/** Inline link with brand styling, used inside body copy. */
export function InfoCtaLink({ text, href }: InfoCtaLinkProps) {
  return (
    <Link
      href={href}
      className="font-medium text-primary hover:text-primary-hover underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors"
    >
      {text}
    </Link>
  );
}

/** Wrap content in a centered narrow column for readability. */
export function NarrowContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Container className={`max-w-3xl ${className ?? ''}`}>
      {children}
    </Container>
  );
}

/** Spacer between info-page sections, used to keep vertical rhythm. */
export function InfoGap() {
  return <div className="h-2" aria-hidden />;
}

export { Section as InfoSection };
