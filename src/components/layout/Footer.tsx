'use client';
import Link from 'next/link';
import type { SVGProps } from 'react';
import { Facebook, Instagram, Linkedin, Twitter, Mail, Check } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { Logo } from '@/components/ui/Logo';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { Container } from './Container';
import { FooterToolGrid } from './FooterToolGrid';
import { useTranslation } from '@/i18n';

function PinterestIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.137.893 2.739.098.119.112.224.083.345l-.333 1.36c-.053.221-.177.267-.408.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.135-2.607 7.464-6.226 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12C24 5.372 18.627 0 12 0z" />
    </svg>
  );
}

function RedditIcon({ className }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

const socialIcons = {
  facebook: Facebook,
  instagram: Instagram,
  x: Twitter,
  pinterest: PinterestIcon,
  linkedin: Linkedin,
  reddit: RedditIcon,
} as const;

export function Footer() {
  const t = useTranslation();

  return (
    <footer className="relative bg-ink text-white overflow-hidden">
      {/* subtle brand glow + grid for depth */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-brand" />
      <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[40rem] h-[24rem] bg-primary/10 blur-3xl rounded-full pointer-events-none" />

      <Container className="relative py-16 md:py-20">
        {/* ── Top: brand + newsletter-style contact ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pb-12 border-b border-white/10">
          {/* Brand block */}
          <div className="lg:col-span-5">
            <Logo variant="light" height={32} />
            <p className="mt-4 text-sm text-ink-muted leading-relaxed max-w-sm">
              {t('footer.description')}
            </p>

            {/* Social media row */}
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-3">
                {t('common.followUs')}
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                {siteConfig.social.map((s) => {
                  const Icon = socialIcons[s.icon as keyof typeof socialIcons];
                  if (!Icon) return null;
                  return (
                    <a
                      key={s.label}
                      href={s.href}
                      aria-label={s.label}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-ink-muted hover:text-white hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-all"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Contact + language */}
          <div className="lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-4">
              {t('footer.stayInLoop') || 'Stay in the loop'}
            </p>
            <p className="text-sm text-ink-muted leading-relaxed mb-5">
              {t('footer.stayInLoopDesc') || 'We read every message. Reach us anytime for support, partnerships, or just to say hi.'}
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-brand bg-[length:200%_200%] shadow-glow-lg hover:bg-[position:100%_50%] transition-all"
            >
              <Mail className="w-4 h-4" />
              {t('nav.contact')}
            </Link>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-3">
                {t('common.language')}
              </p>
              <LanguageSelector variant="footer" />
            </div>
          </div>

          {/* Brand statement */}
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-4">
              {t('footer.whySavDown') || 'Why SavDown'}
            </p>
            <ul className="space-y-3">
              {[t('features.unlimited'), t('features.noSignup') || 'No signup required', t('features.secure')].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-ink-muted">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── SEO mega-grid ── */}
        <FooterToolGrid />

        {/* ── Site nav columns ──── */}
        <div className="mt-14 pt-12 border-t border-white/10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {Object.entries(siteConfig.footerLinks)
            .filter(([heading]) => !['All Tools', 'Social Media Downloaders', 'Video Downloaders', 'Audio Downloaders', 'Image Downloaders'].includes(heading))
            .map(([heading, links]) => {
              const translatedHeading = t(`footer.${heading.toLowerCase()}`) || heading;
              return (
                <div key={heading}>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-white">
                    {translatedHeading}
                  </h3>
                  <ul className="mt-4 space-y-2.5">
                    {links.map((link) => {
                      const translatedLabel = t(`nav.${link.label.toLowerCase().replace(' ', '')}`) || link.label;
                      return (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            className="text-[13px] text-ink-muted hover:text-white transition-colors leading-snug block"
                          >
                            {translatedLabel}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-ink-subtle">
            © {new Date().getFullYear()} {siteConfig.name}. {t('footer.copyright')}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            {siteConfig.footerLinks.Legal.map((link) => {
              const translatedLabel = t(`footer.${link.label.toLowerCase().replace(' ', '')}`) || link.label;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-ink-subtle hover:text-white transition-colors"
                >
                  {translatedLabel}
                </Link>
              );
            })}
          </div>
        </div>
      </Container>
    </footer>
  );
}
