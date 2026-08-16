'use client';

import { Check, Minus } from 'lucide-react';
import { Section, SectionHeading } from '@/components/layout/Section';
import { usePricing } from '@/components/pricing/PricingProvider';
import { buildComparison, comparisonColumns, type ComparisonValue } from '@/config/pricing';

function Cell({ value }: { value: ComparisonValue }) {
  if (value === true) {
    return (
      <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-accent-light">
        <Check className="h-3 w-3 text-accent-hover" />
      </span>
    );
  }
  if (value === false) {
    return <Minus className="mx-auto h-4 w-4 text-text-subtle" aria-label="Not included" />;
  }
  return <span className="text-sm text-text-muted">{value}</span>;
}

/**
 * A compact plan comparison, built from the pricing model so allowances stay in
 * step with the plans. Scrolls inside its own container on small screens.
 */
export function ComparisonTable() {
  const config = usePricing();
  const rows = buildComparison(config);

  return (
    <Section variant="muted" containerClassName="max-w-4xl">
      <SectionHeading
        eyebrow="Compare plans"
        title="What each plan includes."
        description="The differences that actually matter, side by side."
      />

      <div className="mt-12 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-center">
          <thead>
            <tr>
              <th className="w-2/5 px-4 py-3 text-left text-sm font-semibold text-text-muted">Feature</th>
              {comparisonColumns.map((col) => (
                <th key={col} className="px-4 py-3 text-sm font-bold text-text">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? 'bg-white dark:bg-card' : 'bg-surface/60'}>
                <td className="rounded-l-lg px-4 py-3 text-left text-sm font-medium text-text">{row.label}</td>
                <td className="px-4 py-3 align-middle">
                  <Cell value={row.free} />
                </td>
                <td className="px-4 py-3 align-middle">
                  <Cell value={row.pro} />
                </td>
                <td className="rounded-r-lg px-4 py-3 align-middle">
                  <Cell value={row.lifetime} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
