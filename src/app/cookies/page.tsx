import {
  Cookie, ShieldCheck, BarChart3, XCircle, Settings, Globe,
} from 'lucide-react';
import {
  InfoPageHero, InfoBlock, InfoBlockGrid, InfoCallout, NarrowContent, InfoCtaLink,
} from '@/components/layout/InfoPage';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Cookie Policy',
  description: 'How SavDown uses cookies and similar technologies, minimally, transparently, and only when needed.',
  path: '/cookies',
});

const essential = [
  { name: 'next-auth.session-token', purpose: 'Keeps you signed in across pages.' },
  { name: 'next-auth.csrf-token', purpose: 'Prevents cross-site request forgery.' },
  { name: 'Rate-limit identifiers', purpose: 'Protects the service from abuse.' },
  { name: 'googtrans', purpose: 'Remembers your language preference (Google Translate).' },
];

const notUsed = [
  'Advertising cookies',
  'Cross-site tracking cookies',
  'Third-party ad network pixels',
  'Social media tracking pixels',
  'Behavioral profiling cookies',
  'Device fingerprinting',
];

export default function CookiesPage() {
  return (
    <>
      <InfoPageHero
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Cookie Disclaimer' },
        ]}
        eyebrow="Legal"
        title={<>Cookie <span className="text-gradient">Policy.</span></>}
        description="Cookies are small text files stored on your device when you visit a website. SavDown uses the minimum number necessary to make the service work well, nothing more."
        meta="Last updated: January 2026"
        highlights={[
          { icon: <ShieldCheck className="w-3.5 h-3.5 text-accent" />, label: 'Minimal cookies' },
          { icon: <Settings className="w-3.5 h-3.5 text-accent" />, label: 'Opt-out anytime' },
          { icon: <Globe className="w-3.5 h-3.5 text-accent" />, label: 'No cross-site tracking' },
        ]}
      />

      {/* Essential cookies */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Essential cookies</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          Required for the service to work.
        </h2>
        <p className="mt-4 text-text-muted leading-relaxed">
          These are required for basic functionality and cannot be turned off. They store no personal data beyond
          what is necessary for the feature they support.
        </p>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <div className="overflow-hidden rounded-2xl border border-border-light bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-left">
                <th className="px-5 py-3 font-semibold text-text">Cookie</th>
                <th className="px-5 py-3 font-semibold text-text">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {essential.map((c, i) => (
                <tr key={c.name} className={i % 2 === 0 ? 'bg-white' : 'bg-surface/50'}>
                  <td className="px-5 py-4 font-mono text-xs text-primary">{c.name}</td>
                  <td className="px-5 py-4 text-text-muted">{c.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NarrowContent>

      {/* Analytics */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Optional analytics</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          Only if you opt in.
        </h2>
        <p className="mt-4 text-text-muted leading-relaxed">
          If enabled, we use privacy-friendly aggregate analytics to understand which tools are used most. You can
          opt out at any time. We do not use Google Analytics by default.
        </p>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <InfoBlockGrid cols={3}>
          <InfoBlock
            icon={<BarChart3 className="w-5 h-5" />}
            tile="bg-sky-50 text-sky-600"
            title="Aggregate only"
            description="We see which tool is popular, not who used it. No per-user profiles, ever."
          />
          <InfoBlock
            icon={<Settings className="w-5 h-5" />}
            tile="bg-amber-50 text-amber-600"
            title="Opt out anytime"
            description="Toggle analytics off from the cookie banner. Your choice is remembered for one year."
          />
          <InfoBlock
            icon={<ShieldCheck className="w-5 h-5" />}
            tile="bg-emerald-50 text-emerald-600"
            title="No cross-site tracking"
            description="We do not run retargeting pixels, ad networks, or third-party trackers of any kind."
          />
        </InfoBlockGrid>
      </NarrowContent>

      {/* What we don't use */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">What we do not use</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          A short list, kept short on purpose.
        </h2>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <ul className="grid sm:grid-cols-2 gap-3">
          {notUsed.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-5 bg-white border border-border-light rounded-2xl shadow-soft"
            >
              <span className="mt-0.5 w-6 h-6 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm text-text leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </NarrowContent>

      {/* Your choices */}
      <NarrowContent className="pb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Your choices</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          You are always in control.
        </h2>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <InfoBlockGrid cols={2}>
          <InfoBlock
            icon={<Settings className="w-5 h-5" />}
            tile="bg-indigo-50 text-indigo-600"
            title="Browser controls"
            description="You can clear cookies at any time through your browser settings. Note that clearing essential cookies will sign you out."
          />
          <InfoBlock
            icon={<Cookie className="w-5 h-5" />}
            tile="bg-rose-50 text-rose-600"
            title="Cookie banner"
            description="The first time you visit, you will see a banner that explains what we use and lets you opt out of anything non-essential."
          />
        </InfoBlockGrid>
      </NarrowContent>

      <InfoCallout
        title="Questions about cookies?"
        body={<>Read our privacy policy or reach out, we are happy to explain anything in plain English.</>}
        cta={{ label: 'Read privacy policy', href: '/privacy' }}
      />
    </>
  );
}


