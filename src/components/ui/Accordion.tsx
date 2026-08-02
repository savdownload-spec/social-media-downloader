'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export type AccordionItem = {
  question: string;
  answer: string;
};

type AccordionProps = {
  items: AccordionItem[];
  /** Allow multiple items to be open at once (default: false) */
  multiple?: boolean;
};

/**
 * Shared FAQ / Accordion component.
 * Uses framer-motion for a smooth height + opacity reveal, consistent with
 * the home-page FAQ. Accepts a flat { question, answer }[] array and an
 * optional `multiple` flag (single-open by default, matching the original
 * home-page behaviour).
 */
export function Accordion({ items, multiple = false }: AccordionProps) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(multiple ? prev : []);
      if (prev.has(i) && multiple) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = open.has(i);
        return (
          <div
            key={item.question}
            className={`bg-white border rounded-2xl overflow-hidden shadow-soft transition-colors ${
              isOpen ? 'border-primary/40' : 'border-border hover:border-primary/30'
            }`}
          >
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between p-6 text-left group"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-text pr-4">{item.question}</span>
              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown
                  className={`w-5 h-5 flex-shrink-0 ${isOpen ? 'text-primary' : 'text-text-muted'}`}
                />
              </motion.div>
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 text-text-muted leading-relaxed">
                    {item.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
