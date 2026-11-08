import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import type { CatalogTool } from '@/config/catalog';
import { FunctionalToolLayout } from './FunctionalToolLayout';

/** Unimplemented catalog entries retain the full guide without pretending to process files. */
export function GenericToolPage({ tool }: { tool: CatalogTool }) {
  return <FunctionalToolLayout tool={tool} unavailable>
    <div className="rounded-3xl border border-border bg-white p-7 shadow-soft-xl dark:bg-card">
      <div className="flex items-center gap-2 font-bold text-text"><Clock className="h-5 w-5 text-primary" />Processor not available</div>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">{tool.name} has no live processor registered. Read the availability guide below and use a related live tool for supported work. No launch date or future usage allowance is promised.</p>
      <Link href="#related-tools" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-brand px-5 py-3 font-semibold text-white">Explore Related Tools<ArrowRight className="h-4 w-4" /></Link>
    </div>
  </FunctionalToolLayout>;
}
