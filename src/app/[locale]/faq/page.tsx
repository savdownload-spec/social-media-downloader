import { Container } from '@/components/layout/Container';
import { FAQ } from '@/components/home/FAQ';
import { homeFaqs } from '@/config/faqs';
import { tools } from '@/config/tools';
import { buildMetadata, jsonLd, faqSchema } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'FAQ',
  description: 'Answers to the most common questions about SavDown.',
  path: '/faq',
});

export default function FaqPage() {
  const allFaqs = [
    ...homeFaqs,
    ...tools.flatMap((t) =>
      t.faq.map((f) => ({
        question: `${t.shortName}: ${f.question}`,
        answer: f.answer,
      }))
    ),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(faqSchema(allFaqs))}
      />
      <Container className="pt-24 pb-8 max-w-3xl text-center">
        <p className="text-sm font-medium text-primary mb-3">FAQ</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
          Everything You Might Wonder.
        </h1>
        <p className="mt-4 text-text-muted leading-relaxed">
          Can&apos;t find your question? Reach us on the{' '}
          <a href="/contact" className="text-primary underline underline-offset-4">
            contact page
          </a>
          .
        </p>
      </Container>
      <FAQ showHeading={false} showFooter={false} />
    </>
  );
}