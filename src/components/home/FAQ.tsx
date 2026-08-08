'use client';
import { FAQSection } from '@/components/ui/FAQSection';
import { useTranslation } from '@/i18n';

type FAQProps = {
  /** Hide the eyebrow + title when the page already has its own FAQ header. */
  showHeading?: boolean;
  /** Hide the "still curious" links (e.g. on the full FAQ page itself). */
  showFooter?: boolean;
};

export function FAQ({ showHeading = true, showFooter = true }: FAQProps) {
  const t = useTranslation();
  const faqs = (t('faqs.items') as any[]) || [];

  return (
    <FAQSection items={faqs} id="faq" showHeading={showHeading} showFooter={showFooter} />
  );
}
