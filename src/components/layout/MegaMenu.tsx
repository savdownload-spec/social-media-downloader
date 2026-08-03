'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ArrowRight, Zap, Lock, Sparkles, Star,
  MonitorPlay, Film, Search, BookOpen, HelpCircle,
  FileText, MessageCircle, Users, Shield, Info, Mail,
  Layers, Check, Coins, Image,
} from 'lucide-react';
import { catalog, toolGroups, type ToolGroup } from '@/config/catalog';
import { blogPostsByDate } from '@/config/blog';
import { isToolAvailable } from '@/config/catalog';

/* ─── animation ─────────────────────────────────────────────── */
const panelVariants = {
  hidden:  { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: 6,  scale: 0.98, transition: { duration: 0.14 } },
};

/* ─── group meta ─────────────────────────────────────────────── */
const GROUP_META: Record<ToolGroup, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  desc: string;
}> = {
  Downloaders: { icon: MonitorPlay, color: 'text-violet-600 bg-violet-50',   label: 'Downloaders', desc: 'Save videos, audio & images'  },
  Image:       { icon: Image,       color: 'text-sky-600 bg-sky-50',         label: 'Image Tools', desc: 'Edit, convert & enhance'        },
  Video:       { icon: Film,        color: 'text-rose-600 bg-rose-50',       label: 'Video Tools', desc: 'Convert, compress & more'       },
  PDF:         { icon: FileText,    color: 'text-orange-600 bg-orange-50',   label: 'PDF Tools',   desc: 'Merge, split & convert PDFs'    },
  AI:          { icon: Sparkles,    color: 'text-fuchsia-600 bg-fuchsia-50', label: 'AI Tools',    desc: 'AI-powered creator tools'       },
  SEO:         { icon: Search,      color: 'text-emerald-600 bg-emerald-50', label: 'SEO Tools',   desc: 'Rank higher & get found'        },
  Utility:     { icon: Layers,      color: 'text-slate-600 bg-slate-100',    label: 'Utility',     desc: 'QR codes, colors & more'        },
};

const FEATURED_SLUGS = [
  'youtube-video-downloader',
  'tiktok-video-downloader',
  'instagram-reels-downloader',
  'youtube-to-mp3',
];

/* ═══════════════════════════════════════════════════════════
   TOOLS PANEL  — clean 3-zone layout
═══════════════════════════════════════════════════════════ */
function ToolsPanel({ close }: { close: () => void }) {
  const [activeGroup, setActiveGroup] = useState<ToolGroup>('Downloaders');
  const groupTools = catalog.filter((t) => t.group === activeGroup);
  const featured = FEATURED_SLUGS
    .map((s) => catalog.find((t) => t.slug === s))
    .filter(Boolean) as typeof catalog;

  return (
    <div className="flex h-full min-h-0">

      {/* ── Zone 1: Category sidebar ── */}
      <nav className="w-56 shrink-0 border-r border-border-light bg-[#fafafa] p-3 flex flex-col gap-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-widest text-text-subtle">Categories</p>
        {toolGroups.map((g) => {
          const { icon: GIcon, color, label, desc } = GROUP_META[g];
          const active = g === activeGroup;
          return (
            <button
              key={g}
              onMouseEnter={() => setActiveGroup(g)}
              onClick={() => setActiveGroup(g)}
              className={`group flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all ${
                active
                  ? 'bg-white shadow-soft border border-border text-text'
                  : 'text-text-muted hover:text-text hover:bg-white/70'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${color}`}>
                <GIcon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-none">{label}</p>
                <p className="text-[11px] text-text-subtle mt-0.5 leading-none truncate">{desc}</p>
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
            View All Tools <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* ── Zone 2: Tool grid ── */}
      <div className="flex-1 min-w-0 p-5 overflow-y-auto">
        <div className="flex items-center gap-2 mb-4">
          {(() => {
            const { icon: GIcon, color, label } = GROUP_META[activeGroup];
            return (
              <>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
                  <GIcon className="w-3.5 h-3.5" />
                </span>
                <p className="text-sm font-bold text-text">{label}</p>
              </>
            );
          })()}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {groupTools.map((t) => {
            const TIcon = t.icon;
            const live = isToolAvailable(t.slug);
            return (
              <Link
                key={t.slug}
                href={live ? `/tools/${t.slug}` : '/tools'}
                onClick={close}
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-surface border border-transparent hover:border-border transition-all"
              >
                <span className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${t.tile}`}>
                  <TIcon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text group-hover:text-primary transition-colors leading-snug truncate">{t.name}</p>
                  <p className="text-[11px] text-text-subtle leading-snug mt-0.5 line-clamp-1">{t.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Zone 3: Spotlight ── */}
      <div className="w-56 shrink-0 border-l border-border-light p-4 flex flex-col gap-2 bg-[#fafafa]">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">Popular</p>
        {featured.map((t) => {
          const TIcon = t.icon;
          return (
            <Link
              key={t.slug}
              href={`/tools/${t.slug}`}
              onClick={close}
              className="group flex items-center gap-3 p-3 rounded-xl bg-white border border-border hover:border-primary/30 hover:shadow-soft transition-all"
            >
              <span className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${t.tile}`}>
                <TIcon className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors leading-snug truncate">{t.name}</p>
                <span className="inline-flex items-center gap-1 text-[11px] text-accent font-medium">
                  <Zap className="w-3 h-3" /> Free forever
                </span>
              </div>
            </Link>
          );
        })}

        {/* CTA card */}
        <div className="mt-auto rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 p-4">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow mb-3">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <p className="text-sm font-bold text-text">AI Tools Coming</p>
          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">Next-gen AI tools for creators. Join the waitlist for early access.</p>
          <Link
            href="/pricing"
            onClick={close}
            className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            See pricing <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRICING PANEL
═══════════════════════════════════════════════════════════ */
const pricingPlans = [
  { name: 'Free',    price: '$0',  period: 'forever',   desc: 'Everything for everyday downloads.', features: ['All downloaders', 'Up to 1080p HD', 'No watermarks', '30 credits/day'], cta: 'Get Started',   href: '/#tools',  highlight: false, icon: Zap,      iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
  { name: 'Pro',     price: '$9',  period: '/month',     desc: 'For creators who download every day.', features: ['Everything in Free', '4K quality', 'Batch downloads', 'Early AI access'], cta: 'Join Waitlist', href: '/contact', highlight: true,  icon: Sparkles, iconColor: 'text-primary',     iconBg: 'bg-primary-light' },
  { name: 'Credits', price: '$19', period: 'one-time',   desc: 'Pay once. Credits never expire.',   features: ['All Pro features', '3,000 credits', 'Never expire', 'Top up any time'],  cta: 'Join Waitlist', href: '/contact', highlight: false, icon: Coins,    iconColor: 'text-amber-600',   iconBg: 'bg-amber-50' },
];

function PricingPanel({ close }: { close: () => void }) {
  return (
    <div className="p-7">
      {/* header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">Pricing</p>
          <h3 className="text-xl font-bold text-text">Simple, transparent pricing.</h3>
          <p className="text-sm text-text-muted mt-1">Start free, upgrade when you're ready.</p>
        </div>
        <Link href="/pricing" onClick={close} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0 mb-1">
          Full details <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* plan cards */}
      <div className="grid grid-cols-3 gap-4">
        {pricingPlans.map((plan) => {
          const PIcon = plan.icon;
          return (
            <div key={plan.name} className={`relative flex flex-col rounded-2xl p-5 border transition-all ${
              plan.highlight
                ? 'border-primary/30 bg-gradient-to-b from-primary-light/40 to-white shadow-soft-md'
                : 'border-border bg-white hover:border-primary/20 hover:shadow-soft'
            }`}>
              {plan.highlight && (
                <div className="absolute -top-3 inset-x-0 flex justify-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-brand text-white text-[11px] font-bold shadow-glow">
                    <Star className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl ${plan.iconBg} flex items-center justify-center mb-4`}>
                <PIcon className={`w-5 h-5 ${plan.iconColor}`} />
              </div>
              <p className="font-bold text-text text-base">{plan.name}</p>
              <div className="flex items-baseline gap-1 mt-1 mb-1">
                <span className="text-3xl font-extrabold text-text">{plan.price}</span>
                <span className="text-xs text-text-muted">{plan.period}</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed mb-4">{plan.desc}</p>
              <ul className="space-y-2 mb-5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-muted">
                    <Check className="w-4 h-4 text-accent shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} onClick={close} className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                plan.highlight
                  ? 'bg-gradient-brand text-white shadow-glow hover:opacity-90'
                  : 'bg-white border border-border text-text hover:border-primary/40 hover:text-primary'
              }`}>
                {plan.cta} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>

      {/* trust row */}
      <div className="mt-5 pt-5 border-t border-border-light flex items-center gap-8 text-xs text-text-muted">
        <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-accent" /> No credit card required</span>
        <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-accent" /> Free tier forever</span>
        <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-accent" /> Cancel any time</span>
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
  const [tag, setTag] = useState('All');
  const all = blogPostsByDate.slice(0, 6);
  const posts = tag === 'All' ? all : all.filter((p) => p.tags.includes(tag));

  return (
    <div className="p-7">
      {/* header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">Blog</p>
          <h3 className="text-xl font-bold text-text">Latest articles &amp; guides.</h3>
        </div>
        <Link href="/blog" onClick={close} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline shrink-0 mb-1">
          All articles <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* tag pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {BLOG_TAGS.map((t) => (
          <button key={t} onClick={() => setTag(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              tag === t ? 'bg-primary text-white shadow-glow' : 'bg-surface text-text-muted hover:bg-primary-light/60 hover:text-primary'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* posts — featured + grid */}
      <div className="flex gap-4">
        {/* featured */}
        {posts[0] && (
          <Link href={`/blog/${posts[0].slug}`} onClick={close}
            className="group w-56 shrink-0 flex flex-col rounded-2xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all overflow-hidden">
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
              className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all">
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
const resourceLinks = [
  { icon: HelpCircle,    label: 'FAQ',            desc: 'Quick answers to common questions.',       href: '/faq',     color: 'text-violet-600 bg-violet-50'  },
  { icon: BookOpen,      label: 'Blog & Guides',  desc: 'How-to articles and platform tips.',        href: '/blog',    color: 'text-sky-600 bg-sky-50'        },
  { icon: Search,        label: 'Search Tools',   desc: 'Find exactly the tool you need fast.',      href: '/search',  color: 'text-emerald-600 bg-emerald-50'},
  { icon: MessageCircle, label: 'Contact Us',      desc: 'Reach the team — we reply quickly.',        href: '/contact', color: 'text-pink-600 bg-pink-50'      },
  { icon: Shield,        label: 'Privacy Policy', desc: 'How we handle your data.',                  href: '/privacy', color: 'text-slate-600 bg-slate-100'   },
  { icon: FileText,      label: 'Terms of Service',desc: 'Platform guidelines and usage rules.',     href: '/terms',   color: 'text-orange-600 bg-orange-50'  },
];

function ResourcesPanel({ close }: { close: () => void }) {
  return (
    <div className="p-7">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">Resources</p>
        <h3 className="text-xl font-bold text-text">Everything you need to know.</h3>
        <p className="text-sm text-text-muted mt-1">Documentation, support, and legal — all in one place.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {resourceLinks.map((r) => {
          const RIcon = r.icon;
          return (
            <Link key={r.href} href={r.href} onClick={close}
              className="group flex flex-col gap-3 p-4 rounded-2xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.color}`}>
                <RIcon className="w-5 h-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">{r.label}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">{r.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-border-light flex flex-wrap gap-x-6 gap-y-1">
        {[{ label: 'Sitemap', href: '/sitemap.xml' }, { label: 'Cookie Policy', href: '/cookies' }, { label: 'DMCA', href: '/dmca' }].map((l) => (
          <Link key={l.href} href={l.href} onClick={close} className="text-xs text-text-muted hover:text-primary transition-colors">{l.label}</Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ABOUT PANEL
═══════════════════════════════════════════════════════════ */
const aboutLinks = [
  { icon: Info,     label: 'About Us',       desc: 'Our story, mission, and values.',             href: '/about',   color: 'text-violet-600 bg-violet-50'   },
  { icon: Mail,     label: 'Contact',         desc: 'Support, partnerships, and press.',            href: '/contact', color: 'text-sky-600 bg-sky-50'         },
  { icon: Sparkles, label: 'Pricing',         desc: 'Free tier, Pro plan, and credit packs.',       href: '/pricing', color: 'text-fuchsia-600 bg-fuchsia-50' },
  { icon: Shield,   label: 'Privacy Policy', desc: 'We never sell your data.',                     href: '/privacy', color: 'text-emerald-600 bg-emerald-50' },
  { icon: FileText, label: 'Terms',           desc: 'Usage rules and platform guidelines.',         href: '/terms',   color: 'text-orange-600 bg-orange-50'   },
  { icon: Users,    label: 'Careers',         desc: "We're hiring — come build the future.",        href: '/contact', color: 'text-rose-600 bg-rose-50'        },
];

function AboutPanel({ close }: { close: () => void }) {
  return (
    <div className="p-7">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-1">Company</p>
        <h3 className="text-xl font-bold text-text">The team building SavDown.</h3>
        <p className="text-sm text-text-muted mt-1">Fast, private, free — that's our promise.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {aboutLinks.map((a) => {
          const AIcon = a.icon;
          return (
            <Link key={a.label} href={a.href} onClick={close}
              className="group flex flex-col gap-3 p-4 rounded-2xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>
                <AIcon className="w-5 h-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text group-hover:text-primary transition-colors">{a.label}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">{a.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
      <div className="mt-5 pt-4 border-t border-border-light flex items-center gap-3">
        <span className="text-xs text-text-subtle">Follow us:</span>
        {[
          { label: 'X', href: 'https://x.com/savdown' },
          { label: 'Instagram', href: 'https://instagram.com/savdown' },
          { label: 'Facebook', href: 'https://facebook.com/savdown' },
          { label: 'Pinterest', href: 'https://pinterest.com/savdown' },
          { label: 'LinkedIn', href: 'https://linkedin.com/company/savdown' },
        ].map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
            className="text-xs text-text-muted hover:text-primary transition-colors">{s.label}</a>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NAV CONFIG
═══════════════════════════════════════════════════════════ */
type NavId = 'tools' | 'pricing' | 'blog' | 'resources' | 'about';

const NAV_ITEMS: { id: NavId; label: string }[] = [
  { id: 'tools',     label: 'Tools'     },
  { id: 'pricing',   label: 'Pricing'   },
  { id: 'blog',      label: 'Blog'      },
  { id: 'resources', label: 'Resources' },
  { id: 'about',     label: 'About'     },
];

/* Width of each panel — centered on viewport */
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

/* ═══════════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════════ */
export function MegaMenu() {
  const [active, setActive] = useState<NavId | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* mount guard — portal needs document */
  useEffect(() => { setMounted(true); }, []);

  /* close on route change */
  useEffect(() => { setActive(null); }, [pathname]);

  /* close on outside click — check both nav and portal panel */
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

  /* Portal content — lives in document.body, outside the sticky header */
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

          {/* Panel — truly centered on the viewport */}
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
              transform: 'translateX(-50%)',
              zIndex: 100,
            }}
            className={`${PANEL_WIDTH[active]} ${PANEL_HEIGHT[active]} bg-white rounded-2xl border border-border-light shadow-[0_16px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden`}
            role="dialog"
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
      {/* Nav trigger buttons — stay inside the header */}
      <div ref={navRef} className="flex items-center gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onMouseEnter={() => open(item.id)}
              onMouseLeave={scheduleClose}
              onFocus={() => open(item.id)}
              onBlur={scheduleClose}
              onClick={() => (isActive ? close() : open(item.id))}
              aria-expanded={isActive}
              aria-haspopup="true"
              className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isActive ? 'text-text bg-surface' : 'text-text-muted hover:text-text hover:bg-surface/60'
              }`}
            >
              {item.label}
              <motion.span animate={{ rotate: isActive ? 180 : 0 }} transition={{ duration: 0.16 }}>
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </motion.span>
            </button>
          );
        })}
      </div>

      {/* Portal renders into document.body — bypasses sticky/transform stacking context */}
      {mounted && createPortal(portal, document.body)}
    </>
  );
}
