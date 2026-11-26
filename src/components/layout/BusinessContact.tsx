import { Building2, Globe2, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { BusinessDetails } from '@/config/compliance';
import { cn } from '@/lib/utils';

function internationalDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function BusinessContact({
  business,
  variant = 'section',
}: {
  business: BusinessDetails;
  variant?: 'section' | 'footer';
}) {
  const footer = variant === 'footer';
  const phoneHref = `tel:+${internationalDigits(business.phone)}`;
  const whatsappHref = `https://wa.me/${internationalDigits(business.whatsapp)}`;
  const iconClass = footer ? 'h-4 w-4' : 'h-5 w-5';
  const itemClass = footer
    ? 'flex items-start gap-2.5 text-xs text-ink-muted'
    : 'flex items-start gap-3 rounded-2xl border border-border-light bg-white p-4 text-sm text-text-muted shadow-soft dark:bg-card';
  const iconWrapClass = footer
    ? 'mt-0.5 shrink-0 text-white/70'
    : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary';
  const linkClass = footer
    ? 'break-words transition-colors hover:text-white'
    : 'break-words font-medium text-text transition-colors hover:text-primary';

  const name = (
    <div className={itemClass}>
      <span className={iconWrapClass}><Building2 className={iconClass} aria-hidden="true" /></span>
      <div>
        {!footer && <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Business name</p>}
        <p className={footer ? 'font-semibold text-white' : 'mt-1 font-medium text-text'}>{business.name}</p>
      </div>
    </div>
  );

  const address = (
    <div className={cn(itemClass, footer && 'sm:col-span-2')}>
      <span className={iconWrapClass}><MapPin className={iconClass} aria-hidden="true" /></span>
      <div>
        {!footer && <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Office address</p>}
        <p className={footer ? 'leading-relaxed' : 'mt-1 leading-relaxed text-text'}>{business.address}</p>
      </div>
    </div>
  );

  const phone = (
    <div className={itemClass}>
      <span className={iconWrapClass}><Phone className={iconClass} aria-hidden="true" /></span>
      <div>
        {!footer && <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Mobile</p>}
        <a href={phoneHref} className={cn(linkClass, !footer && 'mt-1 inline-block')} aria-label={`Call ${business.name} at ${business.phone}`}>
          {business.phone}
        </a>
      </div>
    </div>
  );

  const whatsapp = (
    <div className={itemClass}>
      <span className={iconWrapClass}><MessageCircle className={iconClass} aria-hidden="true" /></span>
      <div>
        {!footer && <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">WhatsApp</p>}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(linkClass, !footer && 'mt-1 inline-block')}
          aria-label={`Message ${business.name} on WhatsApp at ${business.whatsapp}`}
        >
          {business.whatsapp}
        </a>
      </div>
    </div>
  );

  const website = (
    <div className={itemClass}>
      <span className={iconWrapClass}><Globe2 className={iconClass} aria-hidden="true" /></span>
      <div>
        {!footer && <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Website</p>}
        <a href={business.website} className={cn(linkClass, !footer && 'mt-1 inline-block')}>
          {business.website}
        </a>
      </div>
    </div>
  );

  if (footer) {
    return (
      <address className="grid not-italic gap-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-start">
        {name}
        {address}
        {phone}
        {whatsapp}
        {website}
      </address>
    );
  }

  return (
    <section aria-labelledby="business-contact-heading">
      <h2 id="business-contact-heading" className="text-2xl font-bold tracking-tight text-text md:text-3xl">
        Business contact information
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        Contact {business.name} for questions about the website, digital services, payments, or support.
      </p>
      <address className="mt-6 grid not-italic gap-4 sm:grid-cols-2">
        {name}
        {address}
        {phone}
        {whatsapp}
        {website}
        <div className={itemClass}>
          <span className={iconWrapClass}><Mail className={iconClass} aria-hidden="true" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Email</p>
            <a href={`mailto:${business.email}`} className={cn(linkClass, 'mt-1 inline-block')}>
              {business.email}
            </a>
          </div>
        </div>
      </address>
    </section>
  );
}
