'use client';
import { FAQSection } from '@/components/ui/FAQSection';
import { homeFaqs } from '@/config/faqs';

type FAQProps = {
  /** Hide the eyebrow + title when the page already has its own FAQ header. */
  showHeading?: boolean;
  /** Hide the "still curious" links (e.g. on the full FAQ page itself). */
  showFooter?: boolean;
};

export function FAQ({ showHeading = true, showFooter = true }: FAQProps) {
  return (
    <FAQSection items={[...homeFaqs]} id="faq" showHeading={showHeading} showFooter={showFooter} />
  );
}
