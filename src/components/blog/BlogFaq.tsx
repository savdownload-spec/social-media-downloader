'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type BlogFaqProps = {
  items: { question: string; answer: string }[];
};

// Single-open accordion: opening a question closes the previous one, and
// clicking the open question closes it. Buttons + regions keep it fully
// keyboard and screen-reader accessible.
export function BlogFaq({ items }: BlogFaqProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!items.length) return null;

  return (
    <section id="faq" aria-labelledby="faq-heading" className="mt-12 scroll-mt-28 border-t border-border pt-10">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">FAQ</p>
      <h2 id="faq-heading" className="mt-2 font-display text-2xl font-semibold tracking-tight text-text md:text-3xl">
        Frequently asked questions
      </h2>
      <div className="mt-6 space-y-3">
        {items.map((item, index) => {
          const open = openIndex === index;
          const buttonId = `faq-button-${index}`;
          const panelId = `faq-panel-${index}`;
          return (
            <div
              key={item.question}
              className={`rounded-2xl border bg-white shadow-soft transition-colors dark:bg-card ${
                open ? 'border-primary/25 bg-primary/[0.03]' : 'border-border'
              }`}
            >
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : index)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left text-sm font-semibold text-text focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ outlineColor: 'rgb(var(--primary) / 0.5)' }}
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-primary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!open}
                className="border-t border-border/70 px-5 py-4 text-sm leading-7 text-text-muted"
              >
                {item.answer}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
