import { Container } from '@/components/layout/Container';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'How SavDown handles your data — clearly and honestly.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <Container className="py-24 max-w-3xl">
      <p className="text-sm font-medium text-primary mb-3">Legal</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
        Privacy Policy
      </h1>
      <p className="mt-4 text-sm text-text-muted">Last updated: January 2026</p>

      <div className="prose-elegant mt-10">
        <p>
          Your privacy matters to us. This policy explains, in plain English, what data SavDown
          collects, why we collect it, and how it's handled.
        </p>

        <h2>What we collect</h2>
        <p>
          <strong>URLs you paste.</strong> Only for the duration of resolving your download. We
          cache metadata (title, thumbnail, formats) for up to 30 minutes to speed up repeat
          requests, then discard it.
        </p>
        <p>
          <strong>Anonymous usage data.</strong> IP address hash, user agent, tool used, and
          timestamp — used for rate limiting and analytics. We never link this back to you.
        </p>
        <p>
          <strong>Account data (if you sign in).</strong> Email, name, and profile image from your
          OAuth provider. Nothing more.
        </p>
        <p>
          <strong>Newsletter data (if you subscribe).</strong> Just your email — used to send you
          the calm monthly update and nothing else.
        </p>

        <h2>What we don't collect</h2>
        <ul>
          <li>We never store the actual media files you download.</li>
          <li>We never sell your data to third parties.</li>
          <li>We never track you across the web.</li>
        </ul>

        <h2>Cookies</h2>
        <p>
          We use essential cookies for sign-in sessions and rate limiting. Optional analytics
          cookies are only set if you consent — see our{' '}
          <a href="/cookies">Cookie Disclaimer</a> for the full list.
        </p>

        <h2>Data retention</h2>
        <p>
          Download logs are kept for 90 days for abuse prevention, then deleted. Account data is
          kept for as long as your account exists. You can request deletion at any time by
          emailing our{' '}
          <a href="/contact">contact form</a>.
        </p>

        <h2>Third parties</h2>
        <p>
          We use OAuth providers (Google, GitHub) for sign-in, Vercel or a similar host for
          delivery, and a downloader micro-service for media resolution. Each has their own
          privacy policy. We do not share personal data with advertisers.
        </p>

        <h2>Your rights</h2>
        <p>
          You have the right to access, correct, or delete your data. Email us and we'll respond
          within 30 days.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy questions? Reach us via the <a href="/contact">contact page</a>.
        </p>
      </div>
    </Container>
  );
}
