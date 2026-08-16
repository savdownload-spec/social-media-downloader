import {
  CheckCircle2, XCircle, FileText, AlertTriangle, Scale, RefreshCw,
  Mail, BookOpen, Shield,
} from 'lucide-react';
import {
  InfoPageHero, InfoBlock, InfoBlockGrid, InfoCallout, NarrowContent, InfoCtaLink,
} from '@/components/layout/InfoPage';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Terms of Service',
  description: 'The terms you agree to when using SavDown, written in plain English.',
  path: '/terms',
});

const acceptable = [
  'Downloading content you own or created yourself.',
  'Downloading content licensed under Creative Commons or in the public domain.',
  'Downloading content where the copyright holder has given you explicit permission.',
  'Fair use activities such as education, commentary, or research where legally permitted.',
];

const prohibited = [
  'Downloading copyrighted content without permission from the rights holder.',
  'Redistributing downloaded content commercially without a license.',
  'Circumventing digital rights management (DRM) or technical protection measures.',
  'Overwhelming our service with automated requests or scraping.',
  'Violating the terms of service of any source platform (YouTube, TikTok, etc.).',
];

export default function TermsPage() {
  return (
    <>
      <InfoPageHero
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Terms of Service' },
        ]}
        eyebrow="Legal"
        title={<>Terms of <span className="text-gradient">Service.</span></>}
        description="By using SavDown, you agree to these terms. We have written them in plain English so you do not need a lawyer to understand them."
        meta="Last updated: January 2026"
        highlights={[
          { icon: <FileText className="w-3.5 h-3.5 text-accent" />, label: 'Plain English' },
          { icon: <Scale className="w-3.5 h-3.5 text-accent" />, label: 'Fair & clear' },
          { icon: <Shield className="w-3.5 h-3.5 text-accent" />, label: 'Respects your rights' },
        ]}
      />

      {/* Quick summary */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">The short version</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          The whole agreement in 30 seconds.
        </h2>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <InfoBlockGrid cols={3}>
          <InfoBlock
            icon={<CheckCircle2 className="w-5 h-5" />}
            tile="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
            title="Use SavDown freely"
            description="The service is free for personal, educational, and fair-use downloading of content you have the right to save."
          />
          <InfoBlock
            icon={<XCircle className="w-5 h-5" />}
            tile="bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
            title="Respect creators"
            description="Do not download or redistribute copyrighted content without permission. We follow DMCA takedowns strictly."
          />
          <InfoBlock
            icon={<AlertTriangle className="w-5 h-5" />}
            tile="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-warning"
            title="Use it responsibly"
            description="No scraping, no automation, no abuse. Fair-use rate limits keep the service free for everyone."
          />
        </InfoBlockGrid>
      </NarrowContent>

      {/* Acceptable use */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Acceptable use</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          What you are welcome to do.
        </h2>
        <p className="mt-4 text-text-muted leading-relaxed">
          You agree to use SavDown only for these purposes:
        </p>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <ul className="grid sm:grid-cols-2 gap-3">
          {acceptable.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-5 bg-white dark:bg-card border border-border-light rounded-2xl shadow-soft"
            >
              <span className="mt-0.5 w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm text-text leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </NarrowContent>

      {/* Prohibited use */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Prohibited use</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          What you agree not to do.
        </h2>
        <p className="mt-4 text-text-muted leading-relaxed">
          You may not use SavDown for any of the following:
        </p>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <ul className="grid sm:grid-cols-2 gap-3">
          {prohibited.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-5 bg-white dark:bg-card border border-border-light rounded-2xl shadow-soft"
            >
              <span className="mt-0.5 w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm text-text leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </NarrowContent>

      {/* Other terms */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Other terms</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          The fine print, kept readable.
        </h2>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <InfoBlockGrid cols={2}>
          <InfoBlock
            icon={<BookOpen className="w-5 h-5" />}
            tile="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
            title="Intellectual property"
            description="SavDown does not host, store, or claim ownership over any downloaded content. All content remains the property of its original creators. SavDown is a tool, how you use it is your responsibility."
          />
          <InfoBlock
            icon={<RefreshCw className="w-5 h-5" />}
            tile="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
            title="Service availability"
            description="We aim for 99.9% uptime but make no guarantees. The service is provided 'as is' without warranty of any kind. We may modify, suspend, or discontinue any part of the service at any time."
          />
          <InfoBlock
            icon={<AlertTriangle className="w-5 h-5" />}
            tile="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-warning"
            title="Rate limits"
            description="We enforce rate limits to keep the service fair for everyone. Excessive automated use may result in temporary or permanent blocks."
          />
          <InfoBlock
            icon={<Scale className="w-5 h-5" />}
            tile="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
            title="Liability"
            description="SavDown is not liable for any damages arising from your use of the service, including but not limited to copyright infringement claims resulting from your downloads. You use the service at your own risk."
          />
        </InfoBlockGrid>
      </NarrowContent>

      {/* DMCA + Changes */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">A few more things</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          DMCA, updates, and contact.
        </h2>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-card border border-border-light rounded-2xl shadow-soft">
            <h3 className="text-base font-bold text-text">DMCA</h3>
            <p className="mt-2 text-sm text-text-muted leading-relaxed">
              We respect intellectual property rights. See our <InfoCtaLink text="DMCA page" href="/dmca" /> for how to submit takedown notices.
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-card border border-border-light rounded-2xl shadow-soft">
            <h3 className="text-base font-bold text-text">Changes to these terms</h3>
            <p className="mt-2 text-sm text-text-muted leading-relaxed">
              We may update these terms occasionally. Continued use of the service after changes constitutes acceptance. Material changes will be highlighted in the blog.
            </p>
          </div>
        </div>
      </NarrowContent>

      <InfoCallout
        title="Questions about these terms?"
        body={<>Reach us anytime, we are happy to clarify anything in plain English.</>}
        cta={{ label: 'Contact us', href: '/contact' }}
      />
    </>
  );
}


