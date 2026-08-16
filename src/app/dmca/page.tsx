import {
  Shield, Mail, FileText, Clock, AlertTriangle, CheckCircle2, ListOrdered, Scale,
} from 'lucide-react';
import {
  InfoPageHero, InfoBlock, InfoBlockGrid, InfoCallout, NarrowContent, InfoCtaLink,
} from '@/components/layout/InfoPage';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'DMCA Policy',
  description: 'SavDown\'s DMCA takedown policy and how to submit a notice, clear, fast, and creator-friendly.',
  path: '/dmca',
});

const noticeItems = [
  'A physical or electronic signature of the copyright owner or authorized agent.',
  'Identification of the copyrighted work claimed to be infringed.',
  'Identification of the material to be removed and information reasonably sufficient to locate it.',
  'Your contact information (address, phone number, email).',
  'A statement of good-faith belief that use of the material is not authorized by the copyright owner, its agent, or the law.',
  'A statement, under penalty of perjury, that the information in the notice is accurate and that you are authorized to act on behalf of the copyright owner.',
];

export default function DmcaPage() {
  return (
    <>
      <InfoPageHero
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'DMCA' },
        ]}
        eyebrow="Legal"
        title={<>DMCA <span className="text-gradient">Policy.</span></>}
        description="SavDown respects the intellectual property rights of others and expects users to do the same. Here is how we handle copyright concerns, in plain language."
        meta="Last updated: January 2026"
        highlights={[
          { icon: <Shield className="w-3.5 h-3.5 text-accent" />, label: 'Creator-first' },
          { icon: <Clock className="w-3.5 h-3.5 text-accent" />, label: 'Reviewed within 72 hours' },
          { icon: <Scale className="w-3.5 h-3.5 text-accent" />, label: 'Counter-notices supported' },
        ]}
      />

      {/* Important context */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Important context</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          What SavDown actually does.
        </h2>
        <p className="mt-4 text-text-muted leading-relaxed">
          SavDown does not host, store, or index copyrighted content. We are a tool that facilitates user-directed
          downloads. The actual media resides on the source platforms (YouTube, TikTok, etc.).
        </p>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <InfoBlockGrid cols={3}>
          <InfoBlock
            icon={<FileText className="w-5 h-5" />}
            tile="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
            title="We do not host"
            description="No media file is stored on SavDown's servers. The download streams directly from the source."
          />
          <InfoBlock
            icon={<CheckCircle2 className="w-5 h-5" />}
            tile="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
            title="Public content only"
            description="We only resolve public URLs. Private, restricted, or DRM-protected content is out of scope."
          />
          <InfoBlock
            icon={<Shield className="w-5 h-5" />}
            tile="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
            title="Cooperative takedowns"
            description="Valid DMCA notices are actioned within 72 hours and we keep records to handle repeat infringers."
          />
        </InfoBlockGrid>
      </NarrowContent>

      {/* How to submit a notice */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">How to submit a notice</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          A complete DMCA notice includes:
        </h2>
        <p className="mt-4 text-text-muted leading-relaxed">
          If you are a copyright owner (or an authorized agent) and believe SavDown is being used to infringe your
          copyright, your notice must include the following six elements:
        </p>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <ol className="space-y-3">
          {noticeItems.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-4 p-5 bg-white dark:bg-card border border-border-light rounded-2xl shadow-soft"
            >
              <span className="shrink-0 w-9 h-9 rounded-xl bg-gradient-brand text-white text-sm font-bold flex items-center justify-center shadow-glow-lg">
                {i + 1}
              </span>
              <span className="text-sm text-text leading-relaxed pt-1.5">{item}</span>
            </li>
          ))}
        </ol>
      </NarrowContent>

      {/* Where to send + counter-notices */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Process</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          Where to send it, and what comes next.
        </h2>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <InfoBlockGrid cols={2}>
          <InfoBlock
            icon={<Mail className="w-5 h-5" />}
            tile="bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
            title="Where to send"
            description={<>Submit notices via our <InfoCtaLink text="contact form" href="/contact" /> with subject line &quot;DMCA Notice&quot;, or email our designated agent at <a href="mailto:dmca@savdown.com" className="font-medium text-primary underline underline-offset-4">dmca@savdown.com</a>.</>}
          />
          <InfoBlock
            icon={<Scale className="w-5 h-5" />}
            tile="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-warning"
            title="Counter-notices"
            description="If you believe your content was removed in error, you may submit a counter-notice including identification of the material, a statement under penalty of perjury, and consent to jurisdiction."
          />
          <InfoBlock
            icon={<AlertTriangle className="w-5 h-5" />}
            tile="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
            title="Repeat infringers"
            description="We terminate accounts of users who are found to be repeat infringers, in accordance with the DMCA and applicable law."
          />
          <InfoBlock
            icon={<Clock className="w-5 h-5" />}
            tile="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
            title="Response time"
            description="Valid notices are reviewed and actioned within 72 hours. We send a confirmation email once a determination is made."
          />
        </InfoBlockGrid>
      </NarrowContent>

      <InfoCallout
        title="Need to file a notice?"
        body={<>Use our contact form with the subject &quot;DMCA Notice&quot; and we will route it to the designated agent immediately.</>}
        cta={{ label: 'File a notice', href: '/contact' }}
      />
    </>
  );
}


