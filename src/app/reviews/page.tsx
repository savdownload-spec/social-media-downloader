import { Metadata } from 'next';
import { buildMetadata, jsonLd, breadcrumbSchema } from '@/lib/seo';
import { siteConfig } from '@/config/site';
import { getPublishedReviews } from '@/lib/reviews-server';

export const metadata: Metadata = buildMetadata({
  title: 'Reviews',
  description: 'Real experiences from creators, professionals and everyday users using SavDown.',
  path: '/reviews',
});

import { ReviewsClient } from './ReviewsClient';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: { review?: string; filter?: string };
}) {
  const data = await getPublishedReviews({
    platform: searchParams.filter || 'all',
    limit: 50,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(breadcrumbSchema([
          { name: 'Home', url: siteConfig.url },
          { name: 'Reviews', url: `${siteConfig.url}/reviews` },
        ]))}
      />
      <ReviewsClient
        searchParams={searchParams}
        initialReviews={data.reviews}
        initialSummary={{ averageRating: data.averageRating, reviewCount: data.reviewCount }}
      />
    </>
  );
}
