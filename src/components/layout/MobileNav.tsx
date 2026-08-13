'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, ArrowRight, Zap, Sparkles,
  Film, FileText, Search, BookOpen, HelpCircle, Shield, Info, Mail, Users,
} from 'lucide-react';
import { toolGroups, GROUP_META_MOBILE } from './MobileNavMeta';
import { catalog } from '@/config/catalog';
import { blogPostsByDate } from '@/config/blog';
import { useTranslation } from '@/i18n';

type SectionId = 'tools' | 'pricing' | 'blog' | 'resources' | 'about';
const SECTION_IDS: SectionId[] = ['tools', 'pricing', 'blog', 'resources', 'about'];

/* static icon/color config, labels come from i18n */
const RESOURCE_CONFIG = [
  { key: 'faq',     icon: HelpCircle, href: '/faq',     color: 'text-violet-600 bg-violet-50'   },
  { key: 'blog',    icon: BookOpen,   href: '/blog',    color: 'text-sky-600 bg-sky-50'         },
  { key: 'search',  icon: Search,     href: '/search',  color: 'text-emerald-600 bg-emerald-50' },
  { key: 'privacy', icon: Shield,     href: '/privacy', color: 'text-slate-600 bg-slate-100'    },
  { key: 'terms',   icon: FileText,   href: '/terms',   color: 'text-orange-600 bg-orange-50'   },
  { key: 'cookies', icon: FileText,   href: '/cookies', color: 'text-amber-600 bg-amber-50'     },
] as const;

const ABOUT_CONFIG = [
  { key: 'about',   icon: Info,     href: '/about',   color: 'text-violet-600 bg-violet-50'   },
  { key: 'contact', icon: Mail,     href: '/contact', color: 'text-sky-600 bg-sky-50'         },
  { key: 'pricing', icon: Sparkles, href: '/pricing', color: 'text-fuchsia-600 bg-fuchsia-50' },
  { key: 'careers', icon: Users,    href: '/contact', color: 'text-rose-600 bg-rose-50'        },
] as const;

const PRICING_CONFIG = [
  { key: 'free',    price: '$0',  href: '/#tools',  icon: Zap,      color: 'text-emerald-600 bg-emerald-50' },
  { key: 'pro',     price: '$9',  href: '/contact', icon: Sparkles, color: 'text-primary bg-primary-light'  },
  { key: 'credits', price: '$19', href: '/contact', icon: Film,     color: 'text-amber-600 bg-amber-50'     },
] as const;

export function MobileNav({ close }: { close: () => void }) {
  const t = useTranslation();
  const [openSection, setOpenSection] = useState<SectionId | null>(null);
  const latest3 = blogPostsByDate.slice(0, 3);

  function toggle(id: SectionId) {
    setOpenSection((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex flex-col gap-0.5 py-2">
      {SECTION_IDS.map((id) => {
        const isOpen = openSection === id;
        const label = t(`mobileNav.sections.${id}`) as string;

        return (
          <div key={id}>
            <button
              onClick={() => toggle(id)}
              aria-expanded={isOpen}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-text-muted hover:text-text hover:bg-surface/60 rounded-xl transition-colors"
            >
              {label}
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
                  {id === 'tools' && (
                    <div className="px-3 pb-3 space-y-3">
                      {toolGroups.map((group) => {
                        const tools = catalog.filter((tool) => tool.group === group).slice(0, 4);
                        const meta = GROUP_META_MOBILE[group];
                        const GIcon = meta.icon;
                        const groupLabel = (t(`megaMenu.groupMeta.${group}`) as unknown as { label: string })?.label ?? meta.label;
                        return (
                          <div key={group}>
                            <div className="flex items-center gap-2 px-2 mb-1.5">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center ${meta.color}`}>
                                <GIcon className="w-3 h-3" />
                              </span>
                              <span className="text-xs font-semibold text-text-subtle uppercase tracking-wider">{groupLabel}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {tools.map((tool) => {
                                const TIcon = tool.icon;
                                const toolT = t(`catalog.tools.${tool.slug}`) as unknown as { name: string } | undefined;
                                return (
                                  <Link
                                    key={tool.slug}
                                    href={`/tools/${tool.slug}`}
                                    onClick={close}
                                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-surface text-sm text-text-muted hover:text-text transition-colors"
                                  >
                                    <span className={`w-6 h-6 rounded-md shrink-0 flex items-center justify-center ${tool.tile}`}>
                                      <TIcon className="w-3 h-3" />
                                    </span>
                                    <span className="truncate text-xs font-medium">
                                      {(toolT?.name ?? tool.name).replace(/Downloader|Converter|Generator/g, '').trim()}
                                    </span>
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
                        <ArrowRight className="w-4 h-4" /> {t('mobileNav.viewAllTools')}
                      </Link>
                    </div>
                  )}

                  {/* ── PRICING ── */}
                  {id === 'pricing' && (
                    <div className="px-3 pb-3 space-y-2">
                      {PRICING_CONFIG.map(({ key, price, href, icon: PIcon, color }) => {
                        const plan = t(`mobileNav.pricingPlans.${key}`) as unknown as { name: string; desc: string };
                        return (
                          <Link
                            key={key}
                            href={href}
                            onClick={close}
                            className="flex items-center gap-3 px-3 py-3 rounded-xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all"
                          >
                            <span className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${color}`}>
                              <PIcon className="w-4 h-4" />
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="font-bold text-text text-sm">{plan?.name}</span>
                                <span className="text-sm font-semibold text-primary">{price}</span>
                              </div>
                              <p className="text-xs text-text-muted leading-snug truncate">{plan?.desc}</p>
                            </div>
                          </Link>
                        );
                      })}
                      <Link href="/pricing" onClick={close} className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary-light/60 text-primary text-sm font-semibold hover:bg-primary-light transition-colors">
                        <ArrowRight className="w-4 h-4" /> {t('mobileNav.fullPricingDetails')}
                      </Link>
                    </div>
                  )}

                  {/* ── BLOG ── */}
                  {id === 'blog' && (
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
                        <ArrowRight className="w-4 h-4" /> {t('mobileNav.viewAllArticles')}
                      </Link>
                    </div>
                  )}

                  {/* ── RESOURCES ── */}
                  {id === 'resources' && (
                    <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
                      {RESOURCE_CONFIG.map(({ key, icon: RIcon, href, color }) => (
                        <Link key={href} href={href} onClick={close} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all">
                          <span className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${color}`}>
                            <RIcon className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-sm font-medium text-text">{t(`mobileNav.resourceLinks.${key}`)}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* ── ABOUT ── */}
                  {id === 'about' && (
                    <div className="px-3 pb-3 grid grid-cols-2 gap-1.5">
                      {ABOUT_CONFIG.map(({ key, icon: AIcon, href, color }) => (
                        <Link key={key} href={href} onClick={close} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-white hover:border-primary/20 hover:shadow-soft transition-all">
                          <span className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${color}`}>
                            <AIcon className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-sm font-medium text-text">{t(`mobileNav.aboutLinks.${key}`)}</span>
                        </Link>
                      ))}
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
          <Zap className="w-4 h-4" /> {t('mobileNav.getStartedFree')}
        </Link>
      </div>
    </div>
  );
}
