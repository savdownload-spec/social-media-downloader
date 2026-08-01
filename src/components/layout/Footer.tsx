import Link from 'next/link';
import { Github, Youtube, Mail, Twitter } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { featuredTools } from '@/config/tools';
import { Logo } from '@/components/ui/Logo';
import { Container } from './Container';

const socialIcons = {
  x: Twitter,
  github: Github,
  youtube: Youtube,
  mail: Mail,
} as const;

export function Footer() {
  const downloaders = featuredTools.slice(0, 6);

  return (
    <footer className="relative bg-ink text-white overflow-hidden">
      {/* subtle brand glow + grid for depth */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-brand" />
      <div className="absolute inset-0 bg-grid-dark [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[40rem] h-[24rem] bg-primary/10 blur-3xl rounded-full pointer-events-none" />

      <Container className="relative py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4">
            <Logo variant="light" height={30} />
            <p className="mt-4 text-sm text-ink-muted leading-relaxed max-w-xs">
              {siteConfig.footerDescription}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {siteConfig.social.map((s) => {
                const Icon = socialIcons[s.icon as keyof typeof socialIcons] ?? Mail;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    target={s.href.startsWith('http') ? '_blank' : undefined}
                    rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-ink-muted hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Downloaders (internal linking to tool pages) */}
          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold text-white">Downloaders</h3>
            <ul className="mt-4 space-y-3">
              {downloaders.map((tool) => (
                <li key={tool.slug}>
                  <Link
                    href={`/tools/${tool.slug}`}
                    className="text-sm text-ink-muted hover:text-white transition-colors"
                  >
                    {tool.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Config-driven columns (Legal lives in the bottom bar instead) */}
          {Object.entries(siteConfig.footerLinks)
            .filter(([heading]) => heading !== 'Legal')
            .map(([heading, links]) => (
            <div key={heading} className="md:col-span-2">
              <h3 className="text-sm font-semibold text-white">{heading}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-muted hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-ink-subtle">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved. Not affiliated with any social platform.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            {siteConfig.footerLinks.Legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-ink-subtle hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
