import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Contact SavDown',
  description: 'Contact SavDown with questions, feedback, or support requests about our downloaders and online tools.',
  path: '/contact',
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
