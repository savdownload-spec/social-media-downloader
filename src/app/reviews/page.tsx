import { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

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
  return <ReviewsClient searchParams={searchParams} />;
}
