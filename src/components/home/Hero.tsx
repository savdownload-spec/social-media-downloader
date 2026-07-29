'use client';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/layout/Container';
import { HeroShowcase } from '@/components/home/HeroShowcase';
import { TypingText } from '@/components/ui/TypingText';
import { detectPlatform } from '@/lib/utils';
import { tools } from '@/config/tools';

export function Hero() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleGo = () => {
    const trimmed = url.trim();
    if (!trimmed) return setError('Paste a link to get started.');
    const platform = detectPlatform(trimmed);
    if (!platform) return setError('That doesn\'t look like a supported link.');
    const target =
      tools.find((t) => t.platform === platform && t.featured) ||
      tools.find((t) => t.platform === platform);
    if (!target) return setError('No tool available for that platform yet.');
    router.push(`/tools/${target.slug}?url=${encodeURIComponent(trimmed)}`);
  };

  return (
    <section className="relative overflow-hidden">
      {/* Decorative animated backdrop */}
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,black,transparent)] pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-indigo-brand/25 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-10 -right-24 w-[26rem] h-[26rem] bg-fuchsia-brand/20 rounded-full blur-3xl animate-blob-slow" />
        <div className="absolute -bottom-32 left-1/3 w-[24rem] h-[24rem] bg-primary/20 rounded-full blur-3xl animate-blob" />
      </div>

      <Container className="relative pt-20 pb-16 md:pt-32 md:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-[-0.03em] text-text leading-[1.02]">
            The Free Video Downloader
            <br />
            <span className="text-text-muted">For </span>
            <TypingText
              words={['YouTube', 'TikTok', 'Instagram', 'Facebook', 'Pinterest', 'X']}
              className="text-gradient-animate"
            />
          </h1>

          <p className="mt-6 text-lg text-text-muted max-w-xl mx-auto leading-relaxed">
            Paste any video link and download it in HD — fast, private, and
            watermark-free. Smart AI download tools are coming soon.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 max-w-2xl mx-auto"
        >
          <div className="gradient-ring rounded-[26px] shadow-soft-xl">
            <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-[25px]">
              <Input
                value={url}
                onChange={(e) => { setUrl(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleGo()}
                placeholder="Paste a link from any supported platform…"
                className="border-0 shadow-none focus:shadow-none focus:border-0 px-4 text-base"
                aria-label="Media URL"
              />
              <Button size="lg" onClick={handleGo} className="shrink-0">
                Download
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
          )}

          <p className="mt-5 text-xs text-text-subtle text-center">
            By using SavDown you agree to our{' '}
            <a href="/terms" className="underline underline-offset-2">Terms</a> and{' '}
            <a href="/privacy" className="underline underline-offset-2">Privacy</a>.
            Only download content you own or have rights to.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <HeroShowcase />
        </motion.div>
      </Container>
    </section>
  );
}
