'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/i18n';
import {
  ChevronDown, ArrowRight, Zap, Lock, Sparkles, Star,
  MonitorPlay, Film, Search, BookOpen, HelpCircle,
  FileText, MessageCircle, Users, Shield, Info, Mail,
  Layers, Check, Coins, Image,
} from 'lucide-react';
import { catalog, toolGroups, type ToolGroup } from '@/config/catalog';
import { blogPostsByDate } from '@/config/blog';
import { isToolAvailable } from '@/config/catalog';
import { usePricing } from '@/components/pricing/PricingProvider';
import { derivePlan, deriveLifetime } from '@/config/pricing';

/* ─── animation ─────────────────────────────────────────────── */
const panelVariants = {
  hidden:  { opacity: 0, y: 10, scale: 0.98, x: '-50%' },
  visible: { opacity: 1, y: 0,  scale: 1, x: '-50%', transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: 6,  scale: 0.98, x: '-50%', transition: { duration: 0.14 } },
};

/* ─── group meta (icons + colors stay static; labels/descs come from i18n) ── */
const GROUP_META_ICONS: Record<ToolGroup, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  Downloaders: { icon: MonitorPlay, color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/15'     },
  Image:       { icon: Image,       color: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-500/15'                 },
  Video:       { icon: Film,        color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/15'             },
  PDF:         { icon: FileText,    color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/15'     },
  AI:          { icon: Sparkles,    color: 'text-fuchsia-600 bg-fuchsia-50 dark:text-fuchsia-400 dark:bg-fuchsia-500/15' },
  SEO:         { icon: Search,      color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/15' },
  Utility:     { icon: Layers,      color: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-500/15'        },
};

const FEATURED_SLUGS = [
  'youtube-video-downloader',
  'tiktok-video-downloader',
  'instagram-reels-downloader',
  'youtube-to-mp3',
];

/* ═══════════════════════════════════════════════════════════
   TOOLS PANEL , clean 3-zone layout
═══════════════════════════════════════════════════════════ */
function ToolsPanel({ close }: { close: () => void }) {
  const t = useTranslation();
  const [activeGroup, setActiveGroup] = useState<ToolGroup>('Downloaders');
  const groupTools = catalog.filter((tool) => tool.group === activeGroup);
  const featured = FEATURED_SLUGS
    .map((s) => catalog.find((tool) => tool.slug === s))
    .filter(Boolean) as typeof catalog;

  return (
    <div className="flex h-full min-h-0">

      {/* ── Zone 1: Category sidebar ── */}
      <nav className="w-56 shrink-0 border-r border-border-light bg-[#fafafa] dark:bg-surface p-3 flex flex-col gap-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-text-subtle">{t('megaMenu.categories')}</p>
        {toolGroups.map((g) => {
          const { icon: GIcon, color } = GROUP_META_ICONS[g];
          const groupMeta = t(`megaMenu.groupMeta.${g}`) as unknown as { label: string; desc: string };
          const active = g === activeGroup;
          return (
            <button
              key={g}
              onMouseEnter={() => setActiveGroup(g)}
              onClick={() => setActiveGroup(g)}
              className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all ${
                active
                  ? 'bg-white dark:bg-card shadow-soft border border-border text-text'
                  : 'text-text-muted hover:text-text hover:bg-white/70 dark:hover:bg-card/70'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${color}`}>
                <GIcon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none">{groupMeta?.label ?? g}</p>
                <p className="text-[11px] text-text-subtle mt-0.5 leading-none truncate">{groupMeta?.desc ?? ''}</p>
              </div>
              {active && <ArrowRight className="w-3.5 h-3.5 ml-auto shrink-0 text-primary" />}
            </button>
          );
        })}
        <div className="mt-auto pt-3 border-t border-border-light">
          <Link
            href="/tools"
            onClick={close}
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow hover:opacity-90 transition-opacity"
          >
            {t('megaMenu.viewAllTools')} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* ── Zone 2: Tool grid ── */}
      <div className="flex-1 min-w-0 p-5 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          {(() => {
            const { icon: GIcon, color } = GROUP_META_ICONS[activeGroup];
            const groupMeta = t(`megaMenu.groupMeta.${activeGroup}`) as unknown as { label: string };
            return (
              <>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                  <GIcon className="w-3.5 h-3.5" />
                </span>
                <p className="text-sm font-bold text-text">{groupMeta?.label ?? activeGroup}</p>
              </>
            );
          })()}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {groupTools.map((tool) => {
            const TIcon = tool.icon;
            const live = isToolAvailable(tool.slug);
            const toolT = t(`catalog.tools.${tool.slug}`) as unknown as { name: string; description: string } | undefined;
            return (
              <Link
                key={tool.slug}
                href={live ? `/tools/${tool.slug}` : '/tools'}
                onClick={close}
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-surface border border-transparent hover:border-border transition-all"
              >
                <span className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${tool.tile}`}>
                  <TIcon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text group-hover:text-primary transition-colors leading-snug truncate">{toolT?.name ?? tool.name}</p>
                  <p className="text-[11px] text-text-subtle leading-snug mt-0.5 line-clamp-1">{toolT?.description ?? tool.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Zone 3: Spotlight ── */}
      <div className="w-56 shrink-0 border-l border-border-light p-4 flex flex-col gap-2 bg-[#fafafa] dark:bg-surface">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">{t('megaMenu.popular')}</p>
        {featured.map((tool) => {
          const TIcon = tool.icon;
          const toolT = t(`catalog.tools.${tool.slug}`) as unknown as { name: string } | undefined;
          return (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              onClick={close}
              className="group flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-card border border-border hover:border-primary/30 hover:shadow-soft transition-all"
            >
              <span className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${tool.tile}`}>
                <TIcon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors leading-snug truncate">{toolT?.name ?? tool.name}</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium">
                  <Zap className="w-3 h-3" /> {t('megaMenu.freeForever')}
                </span>
              </div>
            </Link>
          );
        })}

        {/* CTA card */}
        <div className="mt-auto rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-500/10 dark:to-fuchsia-500/10 border border-violet-100 dark:border-violet-500/20 p-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow mb-3">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-bold text-text">{t('megaMenu.aiToolsComing')}</p>
          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{t('megaMenu.aiToolsComingDesc')}</p>
          <Link
            href="/pricing"
            onClick={close}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {t('megaMenu.seePricing')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRICING PANEL
═══════════════════════════════════════════════════════════ */
const PRICING_TILE_STYLES: Record<string, { icon: typeof Zap; iconColor: string; iconBg: string }> = {
  free:     { icon: Zap,      iconColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-500/15' },
  pro:      { icon: Sparkles, iconColor: 'text-primary',     iconBg: 'bg-primary-light' },
  lifetime: { icon: Coins,    iconColor: 'text-amber-600 dark:text-warning',   iconBg: 'bg-amber-50 dark:bg-amber-500/15' },
};

/**
 * Reads pricing from the shared PricingProvider (seeded server-side from the DB
 * source of truth) — so the dropdown can never show a stale price. Shows the
 * two subscription tiers plus Lifetime, all derived from the same model as the
 * pricing page.
 */
function PricingPanel({ close }: { close: () => void }) {
  const t = useTranslation();
  const config = usePricing();

  const free = config.plans.find((p) => p.id === 'free');
  const pro = config.plans.find((p) => p.id === 'pro');
  const freeV = free ? derivePlan(free, 'monthly') : null;
  const proV = pro ? derivePlan(pro, 'monthly') : null;
  const ltV = deriveLifetime(config.lifetime);

  const tiles = [
    freeV && { id: 'free', name: freeV.name, price: freeV.price, period: 'forever', credits: freeV.credits, href: freeV.ctaHref, cta: freeV.ctaLabel, highlight: false },
    proV && { id: 'pro', name: proV.name, price: proV.price, period: '/mo', credits: proV.credits, href: proV.ctaHref, cta: proV.ctaLabel, highlight: true },
    { id: 'lifetime', name: ltV.name, price: ltV.price, period: 'one-time', credits: ltV.credits, href: ltV.ctaHref, cta: ltV.ctaLabel, highlight: false },
  ].filter(Boolean) as {
    id: string; name: string; price: string; period: string; credits: string; href: string; cta: string; highlight: boolean;
  }[];

  return (
    <div className="p-7">
      {/* header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">{t('nav.pricing')}</p>
          <h3 className="text-xl font-bold text-text">{t('megaMenu.pricingTitle') || 'Simple, transparent pricing'}</h3>
          <p className="text-sm text-text-muted mt-1">{t('megaMenu.pricingSubtitle') || 'Start free. Upgrade when you need more.'}</p>
        </div>
        <Link href="/pricing" onClick={close} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0 mb-1">
          {t('megaMenu.fullDetails') || 'Full details'} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* plan tiles */}
      <div className="grid grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const style = PRICING_TILE_STYLES[tile.id] ?? PRICING_TILE_STYLES.free;
          const PIcon = style.icon;
          return (
            <div key={tile.id} className={`relative flex flex-col rounded-2xl p-5 border transition-all ${
              tile.highlight
                ? 'border-primary/30 bg-gradient-to-b from-primary-light to-white dark:to-card shadow-soft-md'
                : 'border-border bg-white dark:bg-card hover:border-primary/20 hover:shadow-soft'
            }`}>
              {tile.highlight && (
                <div className="absolute -top-3 inset-x-0 flex justify-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-brand text-white text-[11px] font-bold shadow-glow">
                    <Star className="w-3 h-3" /> {t('megaMenu.mostPopular') || 'Most Popular'}
                  </span>
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl ${style.iconBg} flex items-center justify-center mb-4`}>
                <PIcon className={`w-5 h-5 ${style.iconColor}`} />
              </div>
              <p className="font-bold text-text text-base">{tile.name}</p>
              <div className="flex items-baseline gap-1 mt-1 mb-1">
                <span className="text-3xl font-extrabold text-text">{tile.price}</span>
                <span className="text-xs text-text-muted">{tile.period}</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed mb-5 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-primary shrink-0" /> {tile.credits}
              </p>
              <Link href={tile.href} onClick={close} className={`mt-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tile.highlight
                  ? 'bg-gradient-brand text-white shadow-glow hover:opacity-90'
                  : 'bg-white dark:bg-card border border-border text-text hover:border-primary/40 hover:text-primary'
              }`}>
                {tile.cta} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* trust row */}
      <div className="mt-5 pt-5 border-t border-border-light flex items-center gap-8 text-xs text-text-muted">
        <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-accent" /> {t('megaMenu.noCreditCard') || 'No credit card to start'}</span>
        <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-accent" /> {t('megaMenu.freeTierForever') || 'Free tier forever'}</span>
        <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-accent" /> {t('megaMenu.cancelAnytime') || 'Cancel anytime'}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BLOG PANEL
═══════════════════════════════════════════════════════════ */
const POST_GRADIENTS = [
  'from-violet-400 to-indigo-500',
  'from-fuchsia-400 to-pink-500',
  'from-sky-400 to-blue-500',
  'from-rose-400 to-orange-400',
];
const BLOG_TAGS = ['All', 'YouTube', 'TikTok', 'Instagram', 'Guides', 'Creators'];

function BlogPanel({ close }: { close: () => void }) {
  const t = useTranslation();
  const [tag, setTag] = useState('All');
  const all = blogPostsByDate.slice(0, 6);
  const posts = tag === 'All' ? all : all.filter((p) => p.tags.includes(tag));

  return (
    <div className="p-7">
      {/* header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">{t('nav.blog')}</p>
          <h3 className="text-xl font-bold text-text">{t('megaMenu.latestArticlesTitle')}</h3>
        </div>
        <Link href="/blog" onClick={close} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0 mb-1">
          {t('megaMenu.allArticles')} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* tag pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {BLOG_TAGS.map((tagLabel) => (
          <button key={tagLabel} onClick={() => setTag(tagLabel)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              tag === tagLabel ? 'bg-primary text-white shadow-glow' : 'bg-surface text-text-muted hover:bg-primary-light hover:text-primary'
            }`}>
            {tagLabel === 'All' ? t('common.all') : tagLabel}
          </button>
        ))}
      </div>

      {/* posts, featured + grid */}
      <div className="flex gap-4">
        {/* featured */}
        {posts[0] && (
          <Link href={`/blog/${posts[0].slug}`} onClick={close}
            className="group w-56 shrink-0 flex flex-col rounded-2xl border border-border bg-white dark:bg-card hover:border-primary/20 hover:shadow-soft transition-all overflow-hidden">
            <div className={`h-28 bg-gradient-to-br ${POST_GRADIENTS[0]} flex items-center justify-center`}>
              <BookOpen className="w-10 h-10 text-white/90" />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex gap-1.5 mb-2 flex-wrap">
                {posts[0].tags.slice(0, 2).map((tg) => (
                  <span key={tg} className="px-2 py-0.5 rounded-full bg-primary-light text-primary text-[11px] font-medium">{tg}</span>
                ))}
              </div>
              <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors leading-snug line-clamp-3 flex-1">{posts[0].title}</p>
              <p className="text-[11px] text-text-muted mt-2">{posts[0].readingTime}</p>
            </div>
          </Link>
        )}

        {/* secondary list */}
        <div className="flex-1 flex flex-col gap-2">
          {posts.slice(1, 5).map((post, i) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} onClick={close}
              className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-white dark:bg-card hover:border-primary/20 hover:shadow-soft transition-all">
              <div className={`w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br ${POST_GRADIENTS[i % POST_GRADIENTS.length]} flex items-center justify-center`}>
                <BookOpen className="w-5 h-5 text-white/90" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text group-hover:text-primary transition-colors leading-snug line-clamp-1">{post.title}</p>
                <p className="text-[11px] text-text-muted mt-0.5">{post.readingTime} · {post.tags[0]}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-text-subtle opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESOURCES PANEL
═══════════════════════════════════════════════════════════ */
const RESOURCE_LINK_CONFIG = [
  { key: 'faq',     icon: HelpCircle,    href: '/faq',    color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/15'  },
  { key: 'blog',    icon: BookOpen,      href: '/blog',   color: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-500/15'        },
  { key: 'search',  icon: Search,        href: '/search',  color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/15'},
  { key: 'contact', icon: MessageCircle, href: '/contact', color: 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-500/15'      },
  { key: 'privacy', icon: Shield,        href: '/privacy', color: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-500/15'   },
  { key: 'terms',   icon: FileText,      href: '/terms',   color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/15'  },
] as const;

function ResourcesPanel({ close }: { close: () => void }) {
  const t = useTranslation();
  return (
    <div className="p-7">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">{t('megaMenu.resourcesEyebrow')}</p>
        <h3 className="text-xl font-bold text-text">{t('megaMenu.resourcesTitle')}</h3>
        <p className="text-sm text-text-muted mt-1">{t('megaMenu.resourcesSubtitle')}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {RESOURCE_LINK_CONFIG.map((r) => {
          const RIcon = r.icon;
          const link = t(`megaMenu.resourceLinks.${r.key}`) as unknown as { label: string; desc: string };
          return (
            <Link key={r.href} href={r.href} onClick={close}
              className="group flex flex-col gap-3 p-4 rounded-2xl border border-border bg-white dark:bg-card hover:border-primary/20 hover:shadow-soft transition-all">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.color}`}>
                <RIcon className="w-5 h-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">{link?.label ?? r.key}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">{link?.desc ?? ''}</p>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-border-light flex flex-wrap gap-x-6 gap-y-1">
        {[
          { key: 'sitemap', href: '/sitemap.xml' },
          { key: 'cookies', href: '/cookies' },
          { key: 'dmca',    href: '/dmca' },
        ].map((l) => (
          <Link key={l.href} href={l.href} onClick={close} className="text-xs text-text-muted hover:text-primary transition-colors">
            {t(`megaMenu.footerLinks.${l.key}`)}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ABOUT PANEL
═══════════════════════════════════════════════════════════ */
const ABOUT_LINK_CONFIG = [
  { key: 'about',      icon: Info,      href: '/about',      color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/15'   },
  { key: 'contact',    icon: Mail,      href: '/contact',    color: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-500/15'         },
  { key: 'pricing',    icon: Sparkles,  href: '/pricing',    color: 'text-fuchsia-600 bg-fuchsia-50 dark:text-fuchsia-400 dark:bg-fuchsia-500/15' },
  { key: 'affiliates', icon: Coins,     href: '/affiliates', color: 'text-amber-600 bg-amber-50 dark:text-warning dark:bg-amber-500/15'     },
  { key: 'privacy',    icon: Shield,    href: '/privacy',    color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/15' },
  { key: 'terms',      icon: FileText,  href: '/terms',      color: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/15'   },
  { key: 'careers',    icon: Users,     href: '/contact',    color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/15'        },
] as const;

const SOCIAL_LINKS = [
  { label: 'X',         href: 'https://x.com/SavDownload' },
  { label: 'Instagram', href: 'https://www.instagram.com/savdownload/?hl=en' },
  { label: 'Facebook',  href: 'https://www.facebook.com/profile.php?id=61592887680787' },
  { label: 'Pinterest', href: 'https://www.pinterest.com/savdownload/_profile/' },
  { label: 'LinkedIn',  href: 'https://www.linkedin.com/company/savdown/' },
];

function AboutPanel({ close }: { close: () => void }) {
  const t = useTranslation();
  return (
    <div className="p-7">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">{t('megaMenu.aboutEyebrow')}</p>
        <h3 className="text-xl font-bold text-text">{t('megaMenu.aboutTitle')}</h3>
        <p className="text-sm text-text-muted mt-1">{t('megaMenu.aboutSubtitle')}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {ABOUT_LINK_CONFIG.map((a) => {
          const AIcon = a.icon;
          const link = t(`megaMenu.aboutLinks.${a.key}`) as unknown as { label: string; desc: string };
          return (
            <Link key={a.key} href={a.href} onClick={close}
              className="group flex flex-col gap-3 p-4 rounded-2xl border border-border bg-white dark:bg-card hover:border-primary/20 hover:shadow-soft transition-all">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>
                <AIcon className="w-5 h-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">{link?.label ?? a.key}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">{link?.desc ?? ''}</p>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-border-light flex items-center gap-3">
        <span className="text-xs text-text-subtle">{t('megaMenu.followUs')}</span>
        {SOCIAL_LINKS.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
            className="text-xs text-text-muted hover:text-primary transition-colors">{s.label}</a>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════════ */
type NavId = 'tools' | 'pricing' | 'blog' | 'resources' | 'about';

const NAV_IDS: NavId[] = ['tools', 'pricing', 'blog', 'resources', 'about'];
const PARENT_HREF: Record<NavId, string> = {
  tools: '/tools',
  pricing: '/pricing',
  blog: '/blog',
  resources: '/faq',
  about: '/about',
};

/* Width of each panel, centered on viewport */
const PANEL_WIDTH: Record<NavId, string> = {
  tools:     'w-[920px]',
  pricing:   'w-[760px]',
  blog:      'w-[680px]',
  resources: 'w-[640px]',
  about:     'w-[640px]',
};

const PANEL_HEIGHT: Record<NavId, string> = {
  tools:     'h-[460px]',
  pricing:   '',
  blog:      '',
  resources: '',
  about:     '',
};

export function MegaMenu() {
  const t = useTranslation();
  const [active, setActive] = useState<NavId | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* mount guard, portal needs document */
  useEffect(() => { setMounted(true); }, []);

  /* close on route change */
  useEffect(() => { setActive(null); }, [pathname]);

  /* close on outside click, check both nav and portal panel */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const panel = document.getElementById('mega-menu-panel');
      if (
        navRef.current && !navRef.current.contains(target) &&
        (!panel || !panel.contains(target))
      ) {
        setActive(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* close on Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const open = useCallback((id: NavId) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActive(id);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setActive(null), 150);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const close = useCallback(() => setActive(null), []);

  /* Portal content, lives in document.body, outside the sticky header */
  const portal = (
    <AnimatePresence>
      {active && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', inset: 0, top: 64, zIndex: 99,
                     background: 'rgba(0,0,0,0.08)', backdropFilter: 'blur(2px)' }}
            onClick={close}
            aria-hidden
          />

          {/* Panel, viewport-centered; x:'-50%' in variants keeps centering during scale/y animation */}
          <motion.div
            id="mega-menu-panel"
            key={active}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{
              position: 'fixed',
              top: 68,
              left: '50%',
              zIndex: 100,
            }}
            className={`${PANEL_WIDTH[active]} ${PANEL_HEIGHT[active]} bg-white dark:bg-card rounded-2xl border border-border-light shadow-[0_16px_64px_-12px_rgba(0,0,0,0.2)] dark:shadow-[0_16px_64px_-12px_rgba(0,0,0,0.6)] overflow-hidden`}
            // Not role="dialog": focus is never moved into this panel and it
            // is not trapped, so announcing a dialog would set an expectation
            // the panel does not meet. It is a disclosure region revealed by
            // the nav item that controls it.
            role="group"
            aria-label={`${active} menu`}
          >
            {active === 'tools'     && <ToolsPanel     close={close} />}
            {active === 'pricing'   && <PricingPanel   close={close} />}
            {active === 'blog'      && <BlogPanel      close={close} />}
            {active === 'resources' && <ResourcesPanel close={close} />}
            {active === 'about'     && <AboutPanel     close={close} />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Nav trigger buttons, stay inside the header */}
      <div ref={navRef} className="flex items-center gap-0.5">
        {NAV_IDS.map((id) => {
          const isActive = active === id;
          const label = t(`mobileNav.sections.${id}`) as string;
          return (
            <Link
              key={id}
              href={PARENT_HREF[id]}
              onMouseEnter={() => open(id)}
              onMouseLeave={scheduleClose}
              onFocus={() => open(id)}
              onBlur={scheduleClose}
              onClick={close}
              // No aria-haspopup: activating this navigates to the section's
              // page, it does not open the panel — the panel opens on hover
              // and focus. Announcing a popup would promise the wrong action.
              // aria-expanded + aria-controls still describe the panel that
              // focusing this item reveals.
              aria-expanded={isActive}
              aria-controls={isActive ? 'mega-menu-panel' : undefined}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isActive ? 'text-text bg-surface' : 'text-text-muted hover:text-text hover:bg-surface/60'
              }`}
            >
              {label}
              <motion.span
                animate={{ rotate: isActive ? 180 : 0 }}
                transition={{ duration: 0.16 }}
                aria-hidden
              >
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </motion.span>
            </Link>
          );
        })}
      </div>

      {/* Portal renders into document.body, bypasses sticky/transform stacking context */}
      {mounted && createPortal(portal, document.body)}
    </>
  );
}
