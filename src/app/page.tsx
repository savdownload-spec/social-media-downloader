import { Hero } from '@/components/home/Hero';
import { Stats } from '@/components/home/Stats';
import { PopularTools } from '@/components/home/PopularTools';
import { MediaShowcase } from '@/components/home/MediaShowcase';
import { TrendingTools } from '@/components/home/TrendingTools';
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
      <Stats />
      <PopularTools />
      <MediaShowcase />
      <TrendingTools />
      <LatestArticles />
      <FAQ />
      <Newsletter />
    </>
  );
}
