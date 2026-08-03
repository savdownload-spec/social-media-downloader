'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ArrowRight, Zap, Sparkles,
  MonitorPlay, Film, Music, Image, FileText,
  Search, BookOpen, HelpCircle, Shield, Info, Mail, Users,
} from 'lucide-react';
import { toolGroups, GROUP_META_MOBILE } from './MobileNavMeta';
import { catalog } from '@/config/catalog';
import { blogPostsByDate } from '@/config/blog';

type SectionId = 'tools' | 'pricing' | 'blog' | 'resources' | 'about';

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'tools',     label: 'Tools' },
  { id: 'pricing',   label: 'Pricing' },
  { id: 'blog',      label: 'Blog' },
  { id: 'resources', label: 'Resources' },
  { id: 'about',     label: 'About' },
];

export function MobileNav({ close }: { close: () => void }) {
  const [openSection, setOpenSection] = useState<SectionId | null>(null);

  function toggle(id: SectionId) {
    setOpenSection((prev) => (prev === id ? null : id));
  }

  const latest3 = blogPostsByDate.slice(0, 3);

  return (
    <div className="flex flex-col gap-0.5 py-2">
      {SECTIONS.map((s) => {
        const isOpen = openSection === s.id;
        return (
          <div key={s.id}>
            <button
              onClick={() => toggle(s.id)}
              aria-expanded={isOpen}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-text-muted hover:text-text hover:bg-surface/60 rounded-xl transition-colors"
            >
              {s.label}
              <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.18 }}>
                <ChevronDown className="w-4 h-4 opacity-50" />
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  {/* ── TOOLS ── */}
                  {s.id === 'tools' && (
                    <div className="px-3 pb-3 space-y-3">
                      {toolGroups.map((group) => {
                        const tools = catalog.filter((t) => t.group === group).slice(0, 4);
                        const meta = GROUP_META_MOBILE[group];
                        const GIcon = meta.icon;
                        return (
                          <div key={group}>
                            <div className="flex items-center gap-2 px-2 mb-1.5">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center ${meta.color}`}>
                                <GIcon className="w-3 h-3" />
                              </span>
                              <span className="text-xs font-semibold text-text-subtle uppercase tracking-wider">{meta.label}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {tools.map((t) => {
                                const TIcon = t.icon;
                                return (
                                  <Link
                                    key={t.slug}
                                    href={`/tools/${t.slug}`}
                                    onClick={close}
                                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-surface text-sm text-text-muted hover:text-text transition-colors"
                                  >
                                    <span className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center ${t.tile}`}>
                                      <TIcon className="w-3 h-3" />
                                    </span>
                                    <span className="truncate text-xs font-medium">{t.name.replace(/Downloader|Converter|Generator/g, '').trim()}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      <Link
                        href="/tools"
                        onClick={close}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-light/60 text-primary text-sm font-semibold hover:bg-primary-light transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" /> View All Tools
                      </Link>
                    </div>
                  )}

                  {/* ── PRICING ── */}
                  {s.id === 'pricing' && (
                    <div className="px-3 pb-3 space-y-2">
                      {[
                        { name: 'Free',    price: '$0',  desc: '30 credits/day, all tools, no watermarks.',    href: '/#tools',  icon: Zap,      color: 'text-emerald-600 bg-emerald-50' },
                        { name: 'Pro',     price: '$9',  desc: '1,500 credits/month, 4K, batch, AI access.',   href: '/contact', icon: Sparkles, color: 'text-primary bg-primary-light'  },
                        { name: 'Credits', price: '$19', desc: '3,000 credits, one-time, never expire.',        href: '/contact', icon: Film,     color: 'text-amber-600 bg-amber-50'     },
                      ].map((plan) => {
                        const PIcon = plan.icon;
                        return (
                          <Link
                            key={plan.name}
                            href={plan.href}
                            onClick={close}
                            className="flex items-center gap-3 px-3 py-3 rounded-xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all"
                          >
                            <span className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${plan.color}`}>
                              <PIcon className="w-4 h-4" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="font-bold text-text text-sm">{plan.name}</span>
                                <span className="text-sm font-semibold text-primary">{plan.price}</span>
                              </div>
                              <p className="text-xs text-text-muted leading-snug truncate">{plan.desc}</p>
                            </div>
                          </Link>
                        );
                      })}
                      <Link href="/pricing" onClick={close} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-light/60 text-primary text-sm font-semibold hover:bg-primary-light transition-colors">
                        <ArrowRight className="w-4 h-4" /> Full Pricing Details
                      </Link>
                    </div>
                  )}

                  {/* ── BLOG ── */}
                  {s.id === 'blog' && (
                    <div className="px-3 pb-3 space-y-2">
                      {latest3.map((post) => (
                        <Link
                          key={post.slug}
                          href={`/blog/${post.slug}`}
                          onClick={close}
                          className="flex items-start gap-3 px-3 py-3 rounded-xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all"
                        >
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shrink-0">
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text leading-snug line-clamp-2">{post.title}</p>
                            <p className="text-xs text-text-muted mt-0.5">{post.readingTime}</p>
                          </div>
                        </Link>
                      ))}
                      <Link href="/blog" onClick={close} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-light/60 text-primary text-sm font-semibold hover:bg-primary-light transition-colors">
                        <ArrowRight className="w-4 h-4" /> View All Articles
                      </Link>
                    </div>
                  )}

                  {/* ── RESOURCES ── */}
                  {s.id === 'resources' && (
                    <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
                      {[
                        { icon: HelpCircle, label: 'FAQ',            href: '/faq',     color: 'text-violet-600 bg-violet-50' },
                        { icon: BookOpen,   label: 'Blog & Guides',  href: '/blog',    color: 'text-sky-600 bg-sky-50' },
                        { icon: Search,     label: 'Search Tools',   href: '/search',  color: 'text-emerald-600 bg-emerald-50' },
                        { icon: Shield,     label: 'Privacy Policy', href: '/privacy', color: 'text-slate-600 bg-slate-100' },
                        { icon: FileText,   label: 'Terms',          href: '/terms',   color: 'text-orange-600 bg-orange-50' },
                        { icon: FileText,   label: 'Cookies',        href: '/cookies', color: 'text-amber-600 bg-amber-50' },
                      ].map((r) => {
                        const RIcon = r.icon;
                        return (
                          <Link key={r.href} href={r.href} onClick={close} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all">
                            <span className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${r.color}`}><RIcon className="w-3.5 h-3.5" /></span>
                            <span className="text-sm font-medium text-text">{r.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* ── ABOUT ── */}
                  {s.id === 'about' && (
                    <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
                      {[
                        { icon: Info,    label: 'About Us', href: '/about',   color: 'text-violet-600 bg-violet-50' },
                        { icon: Mail,    label: 'Contact',  href: '/contact', color: 'text-sky-600 bg-sky-50' },
                        { icon: Sparkles,label: 'Pricing',  href: '/pricing', color: 'text-fuchsia-600 bg-fuchsia-50' },
                        { icon: Users,   label: 'Careers',  href: '/contact', color: 'text-rose-600 bg-rose-50' },
                      ].map((a) => {
                        const AIcon = a.icon;
                        return (
                          <Link key={a.label} href={a.href} onClick={close} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all">
                            <span className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${a.color}`}><AIcon className="w-3.5 h-3.5" /></span>
                            <span className="text-sm font-medium text-text">{a.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* bottom CTA */}
      <div className="px-3 pt-3 mt-1 border-t border-border-light">
        <Link
          href="/#tools"
          onClick={close}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow"
        >
          <Zap className="w-4 h-4" /> Get Started — It's Free
        </Link>
      </div>
    </div>
  );
}
