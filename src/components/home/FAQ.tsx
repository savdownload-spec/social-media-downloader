'use client';
import Link from 'next/link';
import { Section } from '@/components/layout/Section';
import { Accordion } from '@/components/ui/Accordion';
import { useTranslation } from '@/i18n';

export function FAQ() {
  const t = useTranslation();
  const faqs = (t('faqs.items') as any[]) || [];

  return (
    <Section variant="white" id="faq" containerClassName="max-w-3xl">
      <div className="text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">{t('common.faq') || 'FAQ'}</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          {t('faqs.title') || 'Everything You Might Wonder.'}
        </h2>
      </div>

      <Accordion items={faqs} />

      <p className="mt-10 text-center text-sm text-text-muted">
        {t('faqs.stillCurious') || 'Still curious? Visit the '}
        <Link href="/faq" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
          {t('faqs.fullFaq') || 'full FAQ'}
        </Link>{' '}
        {t('common.or') || 'or'}{' '}
        <Link href="/contact" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
          {t('nav.contact') || 'get in touch'}
        </Link>
        .
      </p>
    </Section>
  );
}
