'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type FaqItem = { question: string; answer: string };

export function ToolFaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="rounded-2xl border border-border divide-y divide-border-light overflow-hidden">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-text">{item.question}</span>
              <ChevronDown className={cn('w-4 h-4 text-text-subtle shrink-0 transition-transform', open && 'rotate-180')} />
            </button>
            {open && <p className="px-4 pb-3.5 text-sm text-text-muted leading-relaxed">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
