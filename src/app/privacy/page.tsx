import {
  Shield, Lock, Eye, Database, Clock, UserCheck, Mail, Trash2,
  Cookie, FileText, Server, Globe,
} from 'lucide-react';
import {
  InfoPageHero, InfoBlock, InfoBlockGrid, InfoCallout, NarrowContent, InfoCtaLink,
} from '@/components/layout/InfoPage';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'How SavDown handles your data, clearly, honestly, and with respect for your privacy.',
  path: '/privacy',
});

const principles = [
  {
    icon: <Lock className="w-5 h-5" />,
    tile: 'bg-emerald-50 text-emerald-600',
    title: 'We never store your downloads',
    description: 'The media files you download stream directly from the source. They never touch our disk.',
  },
  {
    icon: <Eye className="w-5 h-5" />,
    tile: 'bg-violet-50 text-violet-600',
    title: 'We do not track you',
    description: 'No cross-site trackers, no ad pixels, no fingerprinting. We never sell or share your data.',
  },
  {
    icon: <Database className="w-5 h-5" />,
    tile: 'bg-sky-50 text-sky-600',
    title: 'Minimal data only',
    description: 'We collect the bare minimum needed to operate the service, and clearly explain each piece.',
  },
  {
    icon: <UserCheck className="w-5 h-5" />,
    tile: 'bg-rose-50 text-rose-600',
    title: 'You are in control',
    description: 'Access, correct, or delete your data at any time. We respond to requests within 30 days.',
  },
];

const collect = [
  { icon: <Server className="w-5 h-5" />, tile: 'bg-amber-50 text-amber-600', title: 'URLs you paste', body: 'Only for the duration of resolving your download. We cache metadata (title, thumbnail, formats) for up to 30 minutes to speed up repeat requests, then discard it.' },
  { icon: <Globe className="w-5 h-5" />, tile: 'bg-indigo-50 text-indigo-600', title: 'Anonymous usage data', body: 'IP address hash, user agent, tool used, and timestamp, used only for rate limiting and aggregate analytics. Never linked back to you.' },
  { icon: <UserCheck className="w-5 h-5" />, tile: 'bg-rose-50 text-rose-600', title: 'Account data (if you sign in)', body: 'Email, name, and profile image from your OAuth provider. Nothing more. We never ask for passwords.' },
  { icon: <Mail className="w-5 h-5" />, tile: 'bg-fuchsia-50 text-fuchsia-600', title: 'Newsletter data (if you subscribe)', body: 'Just your email, used to send you the calm monthly update and absolutely nothing else.' },
];

const rights = [
  { icon: <Eye className="w-5 h-5" />, tile: 'bg-sky-50 text-sky-600', title: 'Right to access', body: 'Ask what data we hold on you and we will send you a copy.' },
  { icon: <FileText className="w-5 h-5" />, tile: 'bg-indigo-50 text-indigo-600', title: 'Right to correct', body: 'See something wrong? We will fix inaccurate information within 30 days.' },
  { icon: <Trash2 className="w-5 h-5" />, tile: 'bg-rose-50 text-rose-600', title: 'Right to delete', body: 'One email and your account and all related data are gone, no hoops, no friction.' },
  { icon: <Cookie className="w-5 h-5" />, tile: 'bg-amber-50 text-amber-600', title: 'Right to opt out', body: 'Decline optional analytics cookies, refuse marketing emails, and turn off anything non-essential.' },
];

export default function PrivacyPage() {
  return (
    <>
      <InfoPageHero
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Privacy Policy' },
        ]}
        eyebrow="Legal"
        title={<>Your Privacy, <span className="text-gradient">Respected.</span></>}
        description="Your privacy matters to us. This policy explains, in plain English, what data SavDown collects, why we collect it, and how it is handled."
        meta="Last updated: January 2026"
        highlights={[
          { icon: <Shield className="w-3.5 h-3.5 text-accent" />, label: 'GDPR-aligned' },
          { icon: <Lock className="w-3.5 h-3.5 text-accent" />, label: 'No third-party trackers' },
          { icon: <Clock className="w-3.5 h-3.5 text-accent" />, label: '30-day response time' },
        ]}
      />

      {/* Our principles */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Our principles</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          Four promises we keep.
        </h2>
        <p className="mt-4 text-text-muted leading-relaxed">
          These are the principles we measure every decision against. If a feature violates one, we do not ship it.
        </p>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <InfoBlockGrid cols={2}>
          {principles.map((p) => (
            <InfoBlock
              key={p.title}
              icon={p.icon}
              tile={p.tile}
              title={p.title}
              description={p.description}
            />
          ))}
        </InfoBlockGrid>
      </NarrowContent>

      {/* What we collect */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">What we collect</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          The minimum, clearly explained.
        </h2>
        <p className="mt-4 text-text-muted leading-relaxed">
          Every data point below serves a specific purpose. If we cannot justify a piece of data, we do not collect it.
        </p>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <InfoBlockGrid cols={2}>
          {collect.map((c) => (
            <InfoBlock
              key={c.title}
              icon={c.icon}
              tile={c.tile}
              title={c.title}
              description={c.body}
            />
          ))}
        </InfoBlockGrid>
      </NarrowContent>

      {/* What we don't collect */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">What we do not collect</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          The list is short. On purpose.
        </h2>
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {[
            'The actual media files you download',
            'Personal data sold to third parties',
            'Cross-site tracking cookies',
            'Ad-network or remarketing pixels',
            'Device fingerprinting',
            'Behavioral profiling of any kind',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 p-4 bg-white border border-border-light rounded-xl">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </span>
              <span className="text-sm text-text-muted leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      </NarrowContent>

      {/* Cookies, retention, third parties, three columns */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">In detail</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          Cookies, retention, and partners.
        </h2>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <div className="grid md:grid-cols-3 gap-5">
          <InfoBlock
            icon={<Cookie className="w-5 h-5" />}
            tile="bg-amber-50 text-amber-600"
            title="Cookies"
            description="We use essential cookies for sign-in and rate limiting. Optional analytics only if you consent, see our Cookie Policy for the full list."
          />
          <InfoBlock
            icon={<Clock className="w-5 h-5" />}
            tile="bg-sky-50 text-sky-600"
            title="Data retention"
            description="Download logs are kept for 90 days for abuse prevention, then deleted. Account data lives as long as your account exists."
          />
          <InfoBlock
            icon={<Server className="w-5 h-5" />}
            tile="bg-indigo-50 text-indigo-600"
            title="Third parties"
            description="We use OAuth providers (Google, GitHub) for sign-in, Vercel for delivery, and a media-resolver micro-service. None of them receive personal data beyond what their function requires."
          />
        </div>
      </NarrowContent>

      {/* Your rights */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Your rights</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          You own your data. Always.
        </h2>
        <p className="mt-4 text-text-muted leading-relaxed">
          We make it easy to exercise your rights, no support tickets, no waiting on hold.
        </p>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <InfoBlockGrid cols={2}>
          {rights.map((r) => (
            <InfoBlock
              key={r.title}
              icon={r.icon}
              tile={r.tile}
              title={r.title}
              description={r.body}
            />
          ))}
        </InfoBlockGrid>
      </NarrowContent>

      <InfoCallout
        title="Privacy questions? Just ask."
        body={<>Reach us via the contact page and we will respond within 30 days, usually much faster.</>}
        cta={{ label: 'Contact us', href: '/contact' }}
      />
    </>
  );
}


