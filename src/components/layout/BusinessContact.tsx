import { Building2, Globe2, Mail, MapPin, Phone } from 'lucide-react';
import type { BusinessDetails } from '@/config/compliance';
import { cn } from '@/lib/utils';

function internationalDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
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
    <div className={itemClass}>
      <span className={iconWrapClass}><MapPin className={iconClass} aria-hidden="true" /></span>
      <div>
        {!footer && <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Office address</p>}
        {footer ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80 mb-1">Our Office</p>
            <p className="leading-relaxed text-sm">{business.address}</p>
          </>
        ) : (
          <p className="mt-1 leading-relaxed text-text">{business.address}</p>
        )}
      </div>
    </div>
  );

  const phone = (
    <div className={itemClass}>
      <span className={iconWrapClass}><Phone className={iconClass} aria-hidden="true" /></span>
      <div>
        {!footer && <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Mobile</p>}
        {footer ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80 mb-1">Call Us</p>
            <a href={phoneHref} className={cn(linkClass, 'text-sm')} aria-label={`Call us at ${business.phone}`}>
              {business.phone}
            </a>
          </>
        ) : (
          <a href={phoneHref} className={cn(linkClass, 'mt-1 inline-block')} aria-label={`Call ${business.name} at ${business.phone}`}>
            {business.phone}
          </a>
        )}
      </div>
    </div>
  );

  const whatsapp = (
    <div className={itemClass}>
      <span className={cn(iconWrapClass, footer && 'text-[#25D366]')}>
        <WhatsAppIcon className={iconClass} />
      </span>
      <div>
        {!footer && <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">WhatsApp</p>}
        {footer ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80 mb-1">WhatsApp Support</p>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(linkClass, 'text-sm group inline-flex items-center gap-1.5')}
              aria-label="Chat with us on WhatsApp"
            >
              <span className="group-hover:text-[#25D366] transition-colors">Chat on WhatsApp</span>
            </a>
          </>
        ) : (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(linkClass, 'mt-1 inline-block')}
            aria-label={`Message ${business.name} on WhatsApp at ${business.whatsapp}`}
          >
            {business.whatsapp}
          </a>
        )}
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
      <div>
        <h3 className="text-base font-semibold text-white mb-1">Get in touch</h3>
        <p className="text-sm text-ink-muted mb-6">Have a question? We're here to help.</p>
        <address className="grid not-italic gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:items-start">
          {address}
          {phone}
          {whatsapp}
        </address>
      </div>
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
