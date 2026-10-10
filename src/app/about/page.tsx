import { buildMetadata } from '@/lib/seo';
import { AboutClient } from './AboutClient';

export const metadata = buildMetadata({
  title: 'About SavDown',
  description:
    'Learn about SavDown — the free, fast video and file downloader built for creators and everyday users. No ads, no watermarks, built with privacy first.',
  path: '/about',
});

export default function AboutPage() {
  return <AboutClient />;
}
