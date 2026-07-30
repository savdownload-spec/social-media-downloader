'use client';
import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Section } from '@/components/layout/Section';
import { homeFaqs } from '@/config/faqs';

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section variant="white" id="faq" containerClassName="max-w-3xl">
      <div className="text-center mb-14">
        <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">FAQ</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          Everything You Might <span className="text-gradient">Wonder.</span>
        </h2>
      </div>

      <div className="space-y-3">
        {homeFaqs.map((faq, i) => (
          <div
            key={faq.question}
            className={`bg-white border rounded-2xl overflow-hidden shadow-soft transition-colors ${open === i ? 'border-primary/40' : 'border-border'}`}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-6 text-left group"
              aria-expanded={open === i}
            >
              <span className="font-semibold text-text pr-4">{faq.question}</span>
              <motion.div
                animate={{ rotate: open === i ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className={`w-5 h-5 flex-shrink-0 ${open === i ? 'text-primary' : 'text-text-muted'}`} />
              </motion.div>
            </button>
            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 text-text-muted leading-relaxed">
                    {faq.answer}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-text-muted">
        Still curious? Visit the{' '}
        <Link href="/faq" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
          full FAQ
        </Link>{' '}
        or{' '}
        <Link href="/contact" className="font-medium text-primary hover:text-primary-hover underline underline-offset-4">
          get in touch
        </Link>
        .
      </p>
    </Section>
  );
}
