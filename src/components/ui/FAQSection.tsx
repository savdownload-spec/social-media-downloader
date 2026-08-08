'use client';

import Link from 'next/link';
import { Section } from '@/components/layout/Section';
import { Accordion, type AccordionItem } from '@/components/ui/Accordion';
import { useTranslation } from '@/i18n';

type FAQSectionProps = {
  items: AccordionItem[];
  /** Background treatment, so the section can alternate with its neighbour. */
  variant?: 'default' | 'white';
  /** Anchor id (the home page uses `faq`). */
  id?: string;
  /** Hide the eyebrow + title when the page already has its own FAQ header. */
  showHeading?: boolean;
  /** Hide the "still curious" links (e.g. on the full FAQ page itself). */
  showFooter?: boolean;
};

/**
 * The single FAQ block used across the whole site.
 *
 * Every page — home, tool pages, functional tools, pricing, /faq — renders this
 * so the heading, spacing, accordion behaviour (one item open at a time) and the
 * reveal animation are identical everywhere. Only the questions themselves are
 * page-specific.
 */
export function FAQSection({
  items,
  variant = 'white',
  id,
  showHeading = true,
  showFooter = true,
}: FAQSectionProps) {
  const t = useTranslation();

  if (!items?.length) return null;

  return (
    <Section variant={variant} id={id} containerClassName="max-w-3xl">
      {showHeading && (
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">
            {t('common.faq') || 'FAQ'}
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
            {t('faqs.title') || 'Frequently Asked Questions'}
          </h2>
        </div>
      )}

      <Accordion items={items} />

      {showFooter && (
        <p className="mt-10 text-center text-sm text-text-muted">
          {t('faqs.stillCurious') || 'Still have questions?'}{' '}
          <Link
            href="/faq"
            className="font-medium text-primary hover:text-primary-hover underline underline-offset-4"
          >
            {t('faqs.fullFaq') || 'View the full FAQ'}
          </Link>{' '}
          {t('common.or') || 'or'}{' '}
          <Link
            href="/contact"
            className="font-medium text-primary hover:text-primary-hover underline underline-offset-4"
          >
            {t('nav.contact') || 'get in touch'}
          </Link>
          .
        </p>
      )}
    </Section>
  );
}
