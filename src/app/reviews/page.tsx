import { Metadata } from 'next';
import { buildMetadata, jsonLd, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = buildMetadata({
  title: 'Reviews',
  description: 'Real experiences from creators, professionals and everyday users using SavDown.',
  path: '/reviews',
});

import { ReviewsClient } from './ReviewsClient';

export default function ReviewsPage({
  searchParams,
}: {
  searchParams: { review?: string; filter?: string };
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([
          { name: 'Home', url: siteConfig.url },
          { name: 'Reviews', url: `${siteConfig.url}/reviews` },
        ]))}
      />
      <ReviewsClient searchParams={searchParams} />
    </>
  );
}
