import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { breadcrumbSchema, jsonLd } from '@/lib/seo';
import { siteConfig } from '@/config/site';

export type BreadcrumbItem = {
  label: string;
  /** Omit on the last item, it renders as the current page, not a link. */
  href?: string;
  schemaUrl?: string;
};

/**
 * Centered glass-pill breadcrumb shared across detail pages. The first item
 * always renders as a compact Home icon (label hidden below `sm`), and the
 * final item is highlighted as a chip to make the current page unmistakable.
 */
export function Breadcrumb({ items, className, includeSchema = false }: { items: BreadcrumbItem[]; className?: string; includeSchema?: boolean }) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex justify-center px-4', className)}>
      {includeSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(
            breadcrumbSchema(items.map((item) => ({
              name: item.label,
              url: item.schemaUrl ?? new URL(item.href ?? '/', siteConfig.url).toString(),
            }))),
          )}
        />
      )}
      <ol className="inline-flex max-w-full items-center gap-1 sm:gap-1.5 rounded-full border border-border-light bg-white/70 dark:bg-card/70 px-3 sm:px-4 py-2 text-xs sm:text-sm shadow-soft backdrop-blur">
        {items.map((item, i) => {
          const isFirst = i === 0;
          const isLast = i === items.length - 1;
          return (
            <li key={item.label} className={cn('flex items-center gap-1 sm:gap-1.5', isLast && 'min-w-0')}>
              {!isFirst && <ChevronRight className="h-3 w-3 flex-shrink-0 text-text-subtle/60" aria-hidden />}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={
                    isLast
                      ? 'truncate rounded-full bg-primary-light px-2.5 py-0.5 font-semibold text-primary max-w-[8rem] sm:max-w-xs'
                      : 'font-medium text-text-muted'
                  }
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 font-medium text-text-muted transition-colors hover:text-primary"
                >
                  {isFirst && <Home className="h-3.5 w-3.5" aria-hidden />}
                  <span className={isFirst ? 'sr-only sm:not-sr-only' : ''}>{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

