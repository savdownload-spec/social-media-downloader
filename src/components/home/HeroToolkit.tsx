import type { CSSProperties } from 'react';
import { tools } from '@/config/tools';
import { getToolMeta } from '@/config/toolMeta';

function Tile({ slug, name }: { slug: string; name: string }) {
  const m = getToolMeta(slug);
  const Icon = m.icon;
  return (
    <div className="flex items-center gap-3 shrink-0 rounded-2xl bg-white border border-border shadow-soft px-4 py-3">
      <span className={`w-10 h-10 rounded-xl ${m.tile} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="text-sm font-semibold text-text whitespace-nowrap">{name}</span>
    </div>
  );
}

function Row({
  items,
  reverse = false,
  duration,
}: {
  items: { slug: string; shortName: string }[];
  reverse?: boolean;
  duration: string;
}) {
  const doubled = [...items, ...items];
  return (
    <div
      className={`flex gap-4 w-max ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'}`}
      style={{ '--marquee-duration': duration } as CSSProperties}
    >
      {doubled.map((t, i) => (
        <Tile key={`${t.slug}-${i}`} slug={t.slug} name={t.shortName} />
      ))}
    </div>
  );
}

/**
 * Animated toolkit showcase: two rows of tool tiles scrolling in opposite
 * directions. Pure CSS marquee (pauses on hover, disabled for reduced motion),
 * so the whole thing is decorative and never gates any content on JS.
 */
export function HeroToolkit() {
  const mid = Math.ceil(tools.length / 2);
  const rowA = tools.slice(0, mid).map((t) => ({ slug: t.slug, shortName: t.shortName }));
  const rowB = tools.slice(mid).map((t) => ({ slug: t.slug, shortName: t.shortName }));

  return (
    <div
      className="marquee-group relative mt-16 space-y-4 [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]"
      aria-hidden
    >
      <Row items={rowA} duration="46s" />
      <Row items={rowB} reverse duration="52s" />
    </div>
  );
}
