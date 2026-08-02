import Link from 'next/link';
import { Section } from '@/components/layout/Section';
import { Accordion } from '@/components/ui/Accordion';
import { homeFaqs } from '@/config/faqs';

export function FAQ() {
  return (
    <Section variant="white" id="faq" containerClassName="max-w-3xl">
      <div className="text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">FAQ</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          Everything You Might <span className="text-gradient">Wonder.</span>
        </h2>
      </div>

      <Accordion items={homeFaqs} />

      <p className="mt-10 text-center text-sm text-text-muted">
        Still curious? Visit the{' '}
        <Link href="/faq" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
          full FAQ
        </Link>{' '}
        or{' '}
        <Link href="/contact" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
          get in touch
        </Link>
        .
      </p>
    </Section>
  );
}
