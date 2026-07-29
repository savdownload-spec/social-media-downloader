import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { Container } from './Container';

export function Footer() {
  return (
    <footer className="relative border-t border-border-light bg-surface/50 mt-24">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-brand opacity-60" />
      <Container className="py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center text-white font-bold text-base shadow-glow-lg">
                S
              </div>
              <span className="font-bold text-text tracking-tight text-lg">{siteConfig.name}</span>
            </Link>
            <p className="mt-4 text-sm text-text-muted leading-relaxed max-w-xs">
              {siteConfig.tagline}
            </p>
          </div>

          {Object.entries(siteConfig.footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-sm font-semibold text-text">{heading}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-muted hover:text-text transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border-light flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} {siteConfig.name}. Not affiliated with any social platform.
          </p>
          <p className="text-xs text-text-subtle">
            Made for people who love clean tools.
          </p>
        </div>
      </Container>
    </footer>
  );
}
