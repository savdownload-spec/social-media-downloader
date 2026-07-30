import { Check, X, Smartphone, Laptop, Tablet, Chrome, Globe, Compass } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { Reveal } from '@/components/ui/Reveal';

const devices = [
  { icon: Smartphone, label: 'iPhone & Android' },
  { icon: Tablet, label: 'iPad & tablets' },
  { icon: Laptop, label: 'Windows, Mac & Linux' },
];

const browsers = [
  { icon: Chrome, label: 'Chrome' },
  { icon: Compass, label: 'Safari' },
  { icon: Globe, label: 'Firefox' },
  { icon: Globe, label: 'Edge' },
  { icon: Globe, label: 'Brave' },
  { icon: Globe, label: 'Opera' },
];

const comparison = [
  { feature: 'Watermark-free output', others: false, savdown: true },
  { feature: 'Resolution up to 4K', others: false, savdown: true },
  { feature: 'No signup required', others: false, savdown: true },
  { feature: 'No pop-up ads or fake buttons', others: false, savdown: true },
  { feature: 'Always free', others: true, savdown: true },
];

export function Compatibility() {
  return (
    <Section variant="default" id="compatibility">
      <SectionHeading
        eyebrow="Works everywhere"
        title={
          <>
            Any Device, Any Browser, <span className="text-gradient">The Same Clean Result.</span>
          </>
        }
        description="There is nothing to install. If it opens a browser, it runs SavDown, and every download comes out at the same high quality."
      />

      <div className="mt-16 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Devices + browsers */}
        <Reveal className="lg:col-span-2">
          <div className="h-full rounded-2xl bg-white border border-border shadow-soft p-8">
            <h3 className="font-bold text-text">Device Compatibility</h3>
            <ul className="mt-4 space-y-3">
              {devices.map((d) => (
                <li key={d.label} className="flex items-center gap-3 text-sm text-text-muted">
                  <span className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center text-primary">
                    <d.icon className="w-4 h-4" />
                  </span>
                  {d.label}
                </li>
              ))}
            </ul>

            <h3 className="mt-8 font-bold text-text">Browser Compatibility</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {browsers.map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border-light text-xs font-medium text-text-muted"
                >
                  <b.icon className="w-3.5 h-3.5" />
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* Quality comparison */}
        <Reveal delay={0.1} className="lg:col-span-3">
          <div className="h-full rounded-2xl bg-white border border-border shadow-soft overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 md:px-8 py-4 border-b border-border-light bg-surface/60">
              <span className="text-sm font-bold text-text">Download Quality</span>
              <span className="w-20 text-center text-xs font-semibold text-text-subtle uppercase tracking-wide">Others</span>
              <span className="w-20 text-center text-xs font-semibold text-primary uppercase tracking-wide">SavDown</span>
            </div>
            <ul>
              {comparison.map((row) => (
                <li
                  key={row.feature}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-6 md:px-8 py-4 border-b border-border-light last:border-0"
                >
                  <span className="text-sm text-text">{row.feature}</span>
                  <span className="w-20 flex justify-center">
                    {row.others ? (
                      <Check className="w-5 h-5 text-accent" />
                    ) : (
                      <X className="w-5 h-5 text-text-subtle/60" />
                    )}
                  </span>
                  <span className="w-20 flex justify-center">
                    {row.savdown ? (
                      <span className="w-6 h-6 rounded-full bg-accent-light flex items-center justify-center">
                        <Check className="w-4 h-4 text-accent-hover" />
                      </span>
                    ) : (
                      <X className="w-5 h-5 text-text-subtle/60" />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
