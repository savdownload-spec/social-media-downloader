import { Container } from '@/components/layout/Container';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Terms of Service',
  description: 'The terms you agree to when using SavDown.',
  path: '/terms',
});

export default function TermsPage() {
  return (
    <Container className="py-24 max-w-3xl">
      <p className="text-sm font-medium text-primary mb-3">Legal</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
        Terms of Service
      </h1>
      <p className="mt-4 text-sm text-text-muted">Last updated: January 2026</p>

      <div className="prose-elegant mt-10">
        <p>
          By using SavDown, you agree to these terms. If you don't agree, please don't use the
          service.
        </p>

        <h2>Acceptable use</h2>
        <p>You agree to use SavDown only for:</p>
        <ul>
          <li>Downloading content you own or created yourself.</li>
          <li>Downloading content licensed under Creative Commons or public domain.</li>
          <li>Downloading content where the copyright holder has given you explicit permission.</li>
          <li>Fair use activities such as education, commentary, or research where legally permitted.</li>
        </ul>

        <h2>Prohibited use</h2>
        <p>You may not use SavDown to:</p>
        <ul>
          <li>Download copyrighted content without permission.</li>
          <li>Redistribute downloaded content commercially.</li>
          <li>Circumvent digital rights management (DRM) or technical protection measures.</li>
          <li>Overwhelm our service with automated requests.</li>
          <li>Violate the terms of service of any source platform.</li>
        </ul>

        <h2>Intellectual property</h2>
        <p>
          SavDown does not host, store, or claim ownership over any downloaded content. All content
          remains the property of its original creators and rights holders. SavDown is a tool — how
          you use it is your responsibility.
        </p>

        <h2>Service availability</h2>
        <p>
          We aim for 99.9% uptime but make no guarantees. The service is provided "as is" without
          warranty of any kind. We may modify, suspend, or discontinue any part of the service at
          any time.
        </p>

        <h2>Rate limits</h2>
        <p>
          We enforce rate limits to keep the service fair for everyone. Excessive automated use may
          result in temporary or permanent blocks.
        </p>

        <h2>Liability</h2>
        <p>
          SavDown is not liable for any damages arising from your use of the service, including but
          not limited to copyright infringement claims resulting from your downloads. You use the
          service at your own risk.
        </p>

        <h2>DMCA</h2>
        <p>
          We respect intellectual property rights. See our <a href="/dmca">DMCA page</a> for how
          to submit takedown notices.
        </p>

        <h2>Changes to these terms</h2>
        <p>
          We may update these terms occasionally. Continued use of the service after changes
          constitutes acceptance.
        </p>

        <h2>Contact</h2>
        <p>
          Questions? Reach us via the <a href="/contact">contact page</a>.
        </p>
      </div>
    </Container>
  );
}
