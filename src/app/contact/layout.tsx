import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Contact GetSavDown',
  description: 'Contact GetSavDown for help with online tools, accounts, subscriptions, credits, refunds, and service activation by phone, WhatsApp, email, or contact form.',
  path: '/contact',
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
