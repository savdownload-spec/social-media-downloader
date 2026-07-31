import type { CSSProperties } from 'react';
import Link from 'next/link';
import { catalog, type CatalogTool } from '@/config/catalog';

function Tile({ tool }: { tool: CatalogTool }) {
  const Icon = tool.icon;
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="flex items-center gap-3 shrink-0 rounded-2xl bg-white border border-border shadow-soft px-4 py-3 hover:shadow-soft-md hover:border-primary/30 hover:-translate-y-0.5 transition-all"
    >
      <span className={`w-10 h-10 rounded-xl ${tool.tile} flex items-center justify-center`}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="text-sm font-semibold text-text whitespace-nowrap">{tool.name}</span>
    </Link>
  );
}

function Row({
  items,
  reverse = false,
  duration,
}: {
  items: CatalogTool[];
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
        <Tile key={`${t.slug}-${i}`} tool={t} />
      ))}
    </div>
  );
}

/**
 * Animated toolkit showcase: two rows of clickable tool tiles scrolling in
 * opposite directions. Pure CSS marquee (pauses on hover, disabled for reduced
 * motion). Each tile links straight to its tool.
 */
export function HeroToolkit() {
  // A representative spread across categories keeps the ribbon varied.
  const featured = catalog.slice(0, 24);
  const mid = Math.ceil(featured.length / 2);
  const rowA = featured.slice(0, mid);
  const rowB = featured.slice(mid);

  return (
    <div className="marquee-group relative mt-16 space-y-4 [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)]">
      <Row items={rowA} duration="46s" />
      <Row items={rowB} reverse duration="52s" />
    </div>
  );
}
