import { Container } from '@/components/layout/Container';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Cookie Disclaimer',
  description: 'How SavDown uses cookies and similar technologies.',
  path: '/cookies',
});

export default function CookiesPage() {
  return (
    <Container className="py-24 max-w-3xl">
      <p className="text-sm font-medium text-primary mb-3">Legal</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
        Cookie Disclaimer
      </h1>
      <p className="mt-4 text-sm text-text-muted">Last updated: January 2026</p>

      <div className="prose-elegant mt-10">
        <p>
          Cookies are small text files stored on your device when you visit a website. SavDown uses
          the minimum number necessary to make the service work well.
        </p>

        <h2>Essential cookies</h2>
        <p>These are required for basic functionality and can't be turned off.</p>
        <ul>
          <li><code>next-auth.session-token</code> — keeps you signed in.</li>
          <li><code>next-auth.csrf-token</code> — prevents cross-site request forgery.</li>
          <li>Rate-limit identifiers — prevent abuse.</li>
        </ul>

        <h2>Analytics cookies (optional)</h2>
        <p>
          If enabled, we use privacy-friendly analytics to understand which tools are used most.
          You can opt out at any time. We don't use Google Analytics by default.
        </p>

        <h2>What we don't use</h2>
        <ul>
          <li>Advertising cookies.</li>
          <li>Cross-site tracking cookies.</li>
          <li>Third-party ad networks.</li>
        </ul>

        <h2>Your choices</h2>
        <p>
          You can clear cookies at any time through your browser settings. Note that clearing
          essential cookies will sign you out.
        </p>
      </div>
    </Container>
  );
}
