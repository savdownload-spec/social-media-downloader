'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { featuredTools } from '@/config/tools';
import { platformBrand } from '@/config/platforms';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export function PopularTools() {
  return (
    <section id="tools" className="py-24 bg-white border-y border-border-light">
      <Container>
        <div className="flex items-end justify-between mb-14">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-gradient inline-block mb-3">Popular tools</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
              The Most-Loved <span className="text-gradient">Downloaders.</span>
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredTools.map((tool, i) => (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
            >
              <Link
                href={`/tools/${tool.slug}`}
                className="group relative flex flex-col h-full bg-white border border-border rounded-2xl p-6 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-brand scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-14 h-14 rounded-2xl ${platformBrand[tool.platform].tile} ${platformBrand[tool.platform].glow} flex items-center justify-center text-white shadow-soft-md transition-shadow group-hover:scale-105`}>
                    <PlatformIcon platform={tool.platform} className="w-7 h-7" />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                    <ArrowUpRight className="w-4 h-4 text-text-muted" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-text tracking-tight group-hover:text-primary transition-colors">
                  {tool.name}
                </h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed flex-1">
                  {tool.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tool.supportedFormats.slice(0, 2).map((f) => (
                    <span
                      key={f}
                      className="text-xs px-2 py-1 rounded-full bg-surface text-text-muted border border-border-light"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
