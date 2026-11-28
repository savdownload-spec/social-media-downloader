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
  { name: 'sd_auto_theme', purpose: 'Remembers the Auto theme choice so pages load in the right light or dark mode.' },
  { name: 'sd_ref', purpose: 'Remembers the affiliate link you arrived from, for 30 days.' },
  { name: 'sd_consent', purpose: 'Remembers your cookie choices.' },
];

const notUsed = [
  'Social media tracking pixels',
  'Third-party ad network pixels',
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
        description="Cookies are small text files stored on your device when you visit a website. SavDown uses only the cookies needed for the service to work, and adds analytics or advertising features only when you allow them."
        meta="Last updated: November 2026"
        highlights={[
          { icon: <ShieldCheck className="w-3.5 h-3.5 text-accent" />, label: 'Minimal cookies' },
          { icon: <Settings className="w-3.5 h-3.5 text-accent" />, label: 'Opt-out anytime' },
          { icon: <Globe className="w-3.5 h-3.5 text-accent" />, label: 'Consent first' },
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
        <div className="overflow-hidden rounded-2xl border border-border-light bg-white dark:bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface text-left">
                <th className="px-5 py-3 font-semibold text-text">Cookie</th>
                <th className="px-5 py-3 font-semibold text-text">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {essential.map((c, i) => (
                <tr key={c.name} className={i % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-surface/50'}>
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
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Optional analytics and marketing</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          Only if you opt in.
        </h2>
        <p className="mt-4 text-text-muted leading-relaxed">
          If you allow analytics, we use Google Analytics 4 (through Google Tag Manager), Vercel Analytics, Vercel
          Speed Insights and Ahrefs to understand which tools and pages are used most. If you allow marketing, Google
          Analytics also uses Google Signals, which adds demographic and interest reports based on people signed in to
          Google and can link to Google Ads audiences. These services set their own cookies or similar storage, and
          none of them runs until you choose Accept All or turn a category on in Cookie Settings.
        </p>
      </NarrowContent>
      <NarrowContent className="pb-16">
        <InfoBlockGrid cols={3}>
          <InfoBlock
            icon={<BarChart3 className="w-5 h-5" />}
            tile="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
            title="Measured, not profiled"
            description="We look at visits, popular tools and page performance. Reports use pseudonymous identifiers, never your name or email."
          />
          <InfoBlock
            icon={<Settings className="w-5 h-5" />}
            tile="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-warning"
            title="Opt out anytime"
            description="Turn categories off from Cookie Settings in the footer. Your choice is remembered for six months, then we ask again."
          />
          <InfoBlock
            icon={<ShieldCheck className="w-5 h-5" />}
            tile="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
            title="Off until you allow it"
            description="Analytics and marketing tags are blocked until you say yes. Reject All keeps them off."
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
            tile="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
            title="Browser controls"
            description="You can clear cookies at any time through your browser settings. Note that clearing essential cookies will sign you out."
          />
          <InfoBlock
            icon={<Cookie className="w-5 h-5" />}
            tile="bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
            title="Cookie banner"
            description="The first time you visit, a banner explains what we use and lets you Accept All, Reject All or choose categories. Cookie Settings in the footer reopens it at any time."
          />
        </InfoBlockGrid>
      </NarrowContent>

      <InfoCallout
        title="Questions about cookies?"
        body={<>Read our privacy policy or reach out, we are happy to explain anything in plain English.</>}
        cta={{ label: 'Read Privacy Policy', href: '/privacy' }}
      />
    </>
  );
}


