'use client';

import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Home,
  DownloadCloud,
  History,
  FolderOpen,
  Layers,
  ListChecks,
  CreditCard,
  Settings,
  Wrench,
  CornerDownLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { catalog, isToolAvailable, type CatalogTool } from '@/config/catalog';

type ResultItem = {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  group: 'Workspace' | 'Tools' | 'Account';
};

const STATIC_ITEMS: ResultItem[] = [
  { id: 'home', label: 'Home', href: '/workspace', icon: Home, group: 'Workspace' },
  { id: 'downloads', label: 'Downloads', href: '/workspace/downloads', icon: DownloadCloud, group: 'Workspace' },
  { id: 'activity', label: 'Activity', href: '/workspace/activity', icon: History, group: 'Workspace' },
  { id: 'files', label: 'My Files (soon)', href: '/workspace/files', icon: FolderOpen, group: 'Workspace' },
  { id: 'collections', label: 'Collections (soon)', href: '/workspace/collections', icon: Layers, group: 'Workspace' },
  { id: 'batch', label: 'Batch (soon)', href: '/workspace/batch', icon: ListChecks, group: 'Workspace' },
  { id: 'all-tools', label: 'Browse all tools', href: '/tools', icon: Wrench, group: 'Tools' },
  { id: 'credits', label: 'Credits & Billing', href: '/account/billing', icon: CreditCard, group: 'Account' },
  { id: 'settings', label: 'Profile & Settings', href: '/account', icon: Settings, group: 'Account' },
];

function toolToResult(tool: CatalogTool): ResultItem {
  return {
    id: `tool-${tool.slug}`,
    label: tool.name,
    sublabel: tool.description,
    href: `/tools/${tool.slug}`,
    icon: tool.icon,
    group: 'Tools',
  };
}

const availableTools = catalog.filter((t) => isToolAvailable(t.slug)).map(toolToResult);

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandBar({ open, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = [...STATIC_ITEMS, ...availableTools];
    if (!q) return STATIC_ITEMS.concat(availableTools.slice(0, 6));
    return pool.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel?.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const groups: Record<string, ResultItem[]> = {};
    for (const item of results) {
      groups[item.group] = groups[item.group] ?? [];
      groups[item.group].push(item);
    }
    return groups;
  }, [results]);

  function go(item: ResultItem) {
    router.push(item.href);
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = results[activeIndex];
        if (item) go(item);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, activeIndex]);

  if (typeof document === 'undefined') return null;

  let flatIndex = -1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[120] flex items-start justify-center pt-24 px-4 bg-ink/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            role="dialog"
            aria-modal="true"
            aria-label="Command bar"
            className="w-full max-w-lg rounded-2xl border border-border bg-white dark:bg-card shadow-soft-xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border-light">
              <Search className="w-4 h-4 text-text-subtle shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search tools, downloads, settings…"
                className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-text-subtle"
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto py-2">
              {results.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-text-muted">No matches for &ldquo;{query}&rdquo;.</p>
              )}
              {(['Workspace', 'Tools', 'Account'] as const).map((group) => {
                const items = grouped[group];
                if (!items?.length) return null;
                return (
                  <div key={group} className="px-2 py-1.5">
                    <p className="px-2.5 mb-1 text-[10px] font-semibold text-text-subtle uppercase tracking-[0.1em]">
                      {group}
                    </p>
                    {items.map((item) => {
                      flatIndex += 1;
                      const active = flatIndex === activeIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onClick={() => go(item)}
                          className={cn(
                            'w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-left transition-colors',
                            active ? 'bg-primary/[0.08]' : 'hover:bg-surface',
                          )}
                        >
                          <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary' : 'text-text-subtle')} />
                          <span className="min-w-0 flex-1">
                            <span className={cn('block text-sm font-medium truncate', active ? 'text-primary' : 'text-text')}>
                              {item.label}
                            </span>
                            {item.sublabel && (
                              <span className="block text-xs text-text-muted truncate">{item.sublabel}</span>
                            )}
                          </span>
                          {active && <CornerDownLeft className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
