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
import { jsonLd, faqSchema } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';

export const revalidate = 3600;

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'faqs' });
  const faqs = (t.raw as any)('items') ?? [];
  
  let posts: any[] = [];
  try {
    const mod = (await import(`@/i18n/translations/blog/${locale}.json`)) as any;
    posts = mod.default?.posts ?? mod.posts ?? [];
  } catch {
    const mod = (await import(`@/i18n/translations/blog/en.json`)) as any;
    posts = mod.default?.posts ?? mod.posts ?? [];
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(faqSchema(faqs))}
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
      <LatestArticles posts={posts} />
      <FAQ />
      <Newsletter />
    </>
  );
}
