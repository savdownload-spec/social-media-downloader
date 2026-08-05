## Footer Improvements — Implementation Plan

### Goal
Make the footer's tool section show a priority-ordered subset initially (first 12 desktop / first 6 mobile) with category headings preserved, and a single "Load More" button that smoothly expands all categories at once. All 56 tool links stay in the DOM (crawlable); only visually collapsed.

### Files

**1. NEW `src/hooks/useMediaQuery.ts`** (no `src/hooks/` dir exists yet)
A small, reusable SSR-safe hook. Returns `false` on server + first client paint (so the desktop limit of 12 is used for SSR/hydration → no hydration mismatch), then syncs to the real viewport via `window.matchMedia` in `useEffect`, updating on resize.
```ts
'use client';
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
```
Note: a mobile user will briefly see 12 then collapse to 6 after hydration (standard SSR+per-viewport pattern; unavoidable given the spec wants different counts per breakpoint).

**2. NEW `src/components/layout/FooterToolGrid.tsx`** (`'use client'`)
Holds the entire current "SEO mega-grid" block (heading, "See all tools" link, the grid, and the new Load More button) plus the collapse logic. It:
- Imports `catalog`, `toolGroups`/`ToolGroup` from `@/config/catalog`, `Link`, framer-motion (`motion`), lucide icons (`ArrowUpRight`, `ChevronDown`).
- Moves `categoryLabels` and `columnOrder` consts here from `Footer.tsx`.
- Defines `PRIORITY_SLUGS` (footer-local UX concern — keeps `catalog.ts` untouched). Order ensures both must-show tools land in the first 6:
  1. `instagram-reels-downloader` (must-show desktop)
  2. `tiktok-to-mp3` (must-show mobile)
  3. `youtube-video-downloader`, `tiktok-video-downloader`, `youtube-to-mp3`, `youtube-thumbnail-downloader`, `instagram-video-downloader`, `facebook-video-downloader`, `x-video-downloader`, `pinterest-video-downloader`
  - then all remaining catalog entries in their existing order.
- Builds a stable priority-ordered copy of the catalog; a tool is "initially visible" if its priority index `< limit`.
- `useMediaQuery('(max-width: 767px)')` → `limit = isMobile ? 6 : 12`. (Below `md:768px` counts as mobile.)
- `const [expanded, setExpanded] = useState(false)`.
- For each category column, splits tools into `visibleTools` / `collapsedTools` and renders:
  ```tsx
  <div className="min-w-0">
    <h3>…heading link…</h3>
    <ul className="mt-4 space-y-2.5">{visibleTools.map(...)}</ul>
    {collapsedTools.length > 0 && (
      <motion.div
        initial={false}
        animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
      >
        <ul className="space-y-2.5 pt-2.5">{collapsedTools.map(...)}</ul>
      </motion.div>
    )}
  </div>
  ```
  Mirrors the existing `Accordion.tsx` transition. All links always in DOM (no `AnimatePresence` removal, no `aria-hidden`) → crawlable + accessible. Categories with no tools in the initial slice show only their heading until expanded (matches the "strict 12/6 global slice" preview you chose).
- Below the grid, a centered "Load More" pill button (subtle outline, matching the footer's muted aesthetic, with a `ChevronDown` that rotates 180° on expand). Toggles `expanded`; text swaps Load More ↔ Show Less. `aria-expanded={expanded}` on the button. No page reload.
- Only render the button if there's anything collapsed (always true here since 56 > 12).

**3. EDIT `src/components/layout/Footer.tsx`** (stays a server component)
- Replace the whole "SEO mega-grid" block (current lines ~144–189) with `<FooterToolGrid />`.
- Remove now-unused imports/consts that moved out: `catalog`, `toolGroups`, `type ToolGroup`, `ArrowUpRight`, and the `categoryLabels` / `columnOrder` / `toolsByGroup` definitions. (Note: `toolGroups` is currently imported but unused — cleaned up.)
- Everything else (brand block, social row, contact/language, "Why SavDown", Resources/Company/Legal columns, bottom bar) is untouched.

### Requirements coverage
- Initial 12 desktop / 6 mobile: ✅ `useMediaQuery` + `limit`.
- Must-show tools (Instagram Reels desktop, TikTok MP3 mobile): ✅ both placed at priority positions 1–2 so they fall within the first 6 on both breakpoints.
- Other high-volume tools prioritized: ✅ positions 3–10.
- Load More / Show Less toggle, smooth height + opacity, no reload: ✅ framer-motion, single `expanded` state.
- Clean/minimal, equal spacing/alignment, responsive: ✅ keeps existing grid classes (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7`); button is a single muted pill.
- SEO: ✅ all 56 links remain in the SSR'd HTML (client component is still server-rendered); nothing removed from DOM, no `aria-hidden`, no `display:none`.

### Verification
- `npx tsc --noEmit` (typecheck).
- `npm run lint` if a lint script exists.
- `npm run build` to confirm the footer still builds and SSR HTML contains the tool links.
- Manual: desktop shows 12 (all in Social Media Downloaders; other headings empty) → Load More expands all 7 categories smoothly → Show Less collapses. Mobile shows 6. Resizing re-applies the limit.