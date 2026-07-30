import { Hero } from '@/components/home/Hero';
import { AllToolsGrid } from '@/components/home/AllToolsGrid';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Features } from '@/components/home/Features';
import { MediaShowcase } from '@/components/home/MediaShowcase';
import { Security } from '@/components/home/Security';
import { Compatibility } from '@/components/home/Compatibility';
import { UseCases } from '@/components/home/UseCases';
import { Testimonials } from '@/components/home/Testimonials';
import { CTASection } from '@/components/home/CTASection';
import { LatestArticles } from '@/components/home/LatestArticles';
import { FAQ } from '@/components/home/FAQ';
import { Newsletter } from '@/components/home/Newsletter';
import { homeFaqs } from '@/config/faqs';
import { jsonLd, faqSchema } from '@/lib/seo';

export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(faqSchema(homeFaqs))}
      />
      <Hero />
      <AllToolsGrid />
      <HowItWorks />
      <Features />
      <MediaShowcase />
      <Security />
      <Compatibility />
      <UseCases />
      <Testimonials />
      <CTASection />
      <LatestArticles />
      <FAQ />
      <Newsletter />
    </>
  );
}
