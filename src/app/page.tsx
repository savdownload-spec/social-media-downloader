import { Hero } from '@/components/home/Hero';
import { AllToolsGrid } from '@/components/home/AllToolsGrid';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Features } from '@/components/home/Features';
import { Security } from '@/components/home/Security';
import { Compatibility } from '@/components/home/Compatibility';
import { UseCases } from '@/components/home/UseCases';
import { Testimonials } from '@/components/home/Testimonials';
import { CTASection } from '@/components/home/CTASection';
import { LatestArticles } from '@/components/home/LatestArticles';
import { FAQ } from '@/components/home/FAQ';
import { Newsletter } from '@/components/home/Newsletter';
import { jsonLd, faqSchema } from '@/lib/seo';
import { getPublicBlogPosts } from '@/lib/blog';
import { homeFaqs } from '@/config/faqs';
import { getToolStatuses } from '@/lib/toolStatuses';

export const revalidate = 300;

export default async function HomePage() {
  const [posts, toolStatuses] = await Promise.all([
    getPublicBlogPosts(),
    getToolStatuses(),
  ]);

  const toolStatusesObj = Object.fromEntries(toolStatuses);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqSchema([...homeFaqs]))} />
      <Hero />
      <AllToolsGrid toolStatuses={toolStatusesObj} />
      <HowItWorks />
      <Features />
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
