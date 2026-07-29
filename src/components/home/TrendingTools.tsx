'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Container } from '@/components/layout/Container';
import { trendingTools } from '@/config/tools';
import { platformBrand } from '@/config/platforms';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export function TrendingTools() {
  return (
    <section className="py-24">
      <Container>
        <div className="max-w-xl mb-14">
          <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-accent-light">
            <TrendingUp className="w-4 h-4 text-accent-hover" />
            <p className="text-sm font-semibold text-accent-hover">Trending now</p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
            What Everyone&apos;s <span className="text-gradient">Downloading.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trendingTools.map((tool, i) => (
            <motion.div
              key={tool.slug}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link
                href={`/tools/${tool.slug}`}
                className="group flex items-center gap-5 p-5 bg-white border border-border rounded-2xl shadow-soft hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`flex-shrink-0 w-12 h-12 rounded-2xl ${platformBrand[tool.platform].tile} ${platformBrand[tool.platform].glow} flex items-center justify-center text-white shadow-soft-md group-hover:scale-105 transition-transform`}>
                  <PlatformIcon platform={tool.platform} className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-text truncate group-hover:text-primary transition-colors">{tool.name}</h3>
                  <p className="text-sm text-text-muted mt-0.5 truncate">
                    {tool.subheadline}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-xs font-semibold text-accent-hover">
                  <TrendingUp className="w-3.5 h-3.5" /> trending
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
