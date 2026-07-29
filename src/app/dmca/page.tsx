import { Container } from '@/components/layout/Container';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'DMCA Policy',
  description: 'SavDown\'s DMCA takedown policy and how to submit a notice.',
  path: '/dmca',
});

export default function DmcaPage() {
  return (
    <Container className="py-24 max-w-3xl">
      <p className="text-sm font-medium text-primary mb-3">Legal</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
        DMCA Policy
      </h1>
      <p className="mt-4 text-sm text-text-muted">Last updated: January 2026</p>

      <div className="prose-elegant mt-10">
        <p>
          SavDown respects the intellectual property rights of others and expects users to do the
          same. In accordance with the Digital Millennium Copyright Act (DMCA), we will respond
          expeditiously to claims of copyright infringement.
        </p>

        <h2>Important context</h2>
        <p>
          SavDown does not host, store, or index copyrighted content. We are a tool that facilitates
          user-directed downloads. The actual media resides on the source platforms (YouTube,
          TikTok, etc.).
        </p>

        <h2>How to submit a notice</h2>
        <p>
          If you are a copyright owner (or an authorized agent) and believe SavDown is being used to
          infringe your copyright, send a written notice to our designated agent that includes:
        </p>
        <ol className="list-decimal pl-6 space-y-2 text-text-muted mb-4">
          <li>A physical or electronic signature of the copyright owner or authorized agent.</li>
          <li>Identification of the copyrighted work claimed to be infringed.</li>
          <li>Identification of the material to be removed and information reasonably sufficient to locate it.</li>
          <li>Your contact information (address, phone number, email).</li>
          <li>
            A statement that you have a good-faith belief that use of the material is not
            authorized by the copyright owner, its agent, or the law.
          </li>
          <li>
            A statement, under penalty of perjury, that the information in the notice is accurate
            and that you are authorized to act on behalf of the copyright owner.
          </li>
        </ol>

        <h2>Where to send</h2>
        <p>
          Submit notices via our <a href="/contact">contact form</a> with subject line
          "DMCA Notice" — or email our designated agent at{' '}
          <a href="mailto:dmca@example.com">dmca@example.com</a>.
        </p>

        <h2>Counter-notices</h2>
        <p>
          If you believe your content was removed in error, you may submit a counter-notice
          including your identification of the material, a statement under penalty of perjury that
          you have a good-faith belief that removal was a mistake, and your consent to jurisdiction
          in the relevant federal court.
        </p>

        <h2>Repeat infringers</h2>
        <p>
          We terminate accounts of users who are found to be repeat infringers, in accordance with
          the DMCA and applicable law.
        </p>
      </div>
    </Container>
  );
}
