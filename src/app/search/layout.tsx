import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Search SavDown',
  description: 'Search SavDown for video downloaders, image tools, PDF tools, guides, and more.',
  path: '/search',
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
