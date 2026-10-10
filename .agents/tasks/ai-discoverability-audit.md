# SavDown AI/Search Discoverability — Implementation Audit

## Build Result

**Status: ✅ PASS — `npm run build` compiled successfully, zero TypeScript errors.**

Prisma DB URL errors during static page generation are expected in the local build environment (no production DB configured). These are not build failures; all 52 pages generated without blocking errors.

---

## Changes Made

### A. `src/app/robots.ts` — Explicit per-crawler rules

**Change:** Replaced the single wildcard rule with explicit per-crawler `Allow: '/'` rules for 9 documented AI/search crawlers, plus a wildcard baseline. Expanded `Disallow` list to include all private application paths.

**Per-crawler robots.txt status:**

| Crawler | Provider | Status |
|---|---|---|
| `GPTBot` | OpenAI (training) | ✅ Explicitly allowed |
| `OAI-SearchBot` | OpenAI (ChatGPT Search) | ✅ Explicitly allowed |
| `ChatGPT-User` | OpenAI (browsing plugin) | ✅ Explicitly allowed |
| `Googlebot` | Google (web) | ✅ Explicitly allowed |
| `Google-Extended` | Google (Gemini/AI training) | ✅ Explicitly allowed |
| `Bingbot` | Microsoft (Bing/Copilot) | ✅ Explicitly allowed |
| `MicrosoftPreview` | Microsoft (link preview/Copilot) | ✅ Explicitly allowed |
| `ClaudeBot` | Anthropic (Claude) | ✅ Explicitly allowed |
| `PerplexityBot` | Perplexity AI | ✅ Explicitly allowed |
| `*` (all others) | catch-all baseline | ✅ Allow `/`, disallow private paths |

**Disallowed private paths (all crawlers):**
`/admin`, `/admin/`, `/workspace`, `/workspace/`, `/account`, `/account/`, `/billing`, `/api/`, `/auth/`, `/_next/`, `/cdn-cgi/`

---

### B. `src/app/sitemap.ts` — Added missing public routes

**Change:** Added `/reviews` (priority 0.6, weekly) and `/affiliates` (priority 0.5, monthly) to the static routes array. Both pages are confirmed public pages with their own metadata.

---

### C. `src/app/layout.tsx` — Organization + WebSite JSON-LD in root layout

**Change:** Added two structured data blocks to the root layout `<head>`:
- `Organization` schema with siteConfig name, URL, logo, description, and all 6 social profile links (Facebook, Instagram, X, Pinterest, LinkedIn, Reddit)
- `WebSite` schema with SearchAction (Sitelinks Searchbox eligibility) pointing to `/search?q={search_term_string}`

Both schemas share a single `<script type="application/ld+json">` tag via `@graph` wrapper, using the existing `jsonLd()` helper.

---

### D. `src/lib/seo.ts` — New schema helpers

**Change:** Added three new exported functions:

1. `organizationSchema()` — returns Organization JSON-LD using `siteConfig.name`, `siteConfig.url`, `siteConfig.description`, and `siteConfig.social` for `sameAs`
2. `websiteSchema()` — returns WebSite JSON-LD with SearchAction using `siteConfig.url`
3. `howToSchema(name, steps)` — returns HowTo JSON-LD with numbered `HowToStep` entries

No existing functions were modified.

---

### E. `src/components/tools/ToolPage.tsx` — HowTo JSON-LD for downloader tools

**Change:** Added import of `howToSchema` from `@/lib/seo`. Added `<script type="application/ld+json">` block emitting `HowTo` structured data from `tool.howTo` array, immediately after the existing `FAQPage` script tag.

---

### F. `src/components/tools/FunctionalToolLayout.tsx` — HowTo JSON-LD for functional tools

**Change:** Added import of `howToSchema`. Added conditional `<script type="application/ld+json">` block emitting `HowTo` schema from `content.howTo` (only when `content` and `content.howTo` are non-empty), alongside the existing `SoftwareApplication` and `FAQPage` script tags.

---

### G. `src/components/tools/GenericToolPage.tsx` — SoftwareApplication JSON-LD for coming-soon tools

**Change:** Added import of `softwareAppSchema`. Added `<script type="application/ld+json">` block emitting `SoftwareApplication` schema with `availability: 'https://schema.org/PreOrder'` for catalog tools that are not yet live, before the existing `BreadcrumbList` script tag.

---

### H. Private workspace pages — noIndex metadata (11 pages)

**Change:** Added `export const metadata = buildMetadata({ noIndex: true })` to all workspace/auth pages that lacked it:

| File | Title | Path |
|---|---|---|
| `src/app/workspace/page.tsx` | Dashboard | `/workspace` |
| `src/app/workspace/activity/page.tsx` | Activity | `/workspace/activity` |
| `src/app/workspace/batch/page.tsx` | Batch Download | `/workspace/batch` |
| `src/app/workspace/collections/page.tsx` | Collections | `/workspace/collections` |
| `src/app/workspace/downloads/page.tsx` | Downloads | `/workspace/downloads` |
| `src/app/workspace/files/page.tsx` | Files | `/workspace/files` |
| `src/app/workspace/settings/page.tsx` | Settings | `/workspace/settings` |
| `src/app/workspace/billing/page.tsx` | Billing | `/workspace/billing` |
| `src/app/workspace/pricing/page.tsx` | Upgrade | `/workspace/pricing` |

For billing and settings, existing bare `{ title: '...' }` metadata was replaced with the proper `buildMetadata({ noIndex: true })` call. Import layout was also cleaned up in these files (imports were split across the file due to insertion method; rewritten cleanly).

---

### I. Auth pages — noIndex via server component wrapper pattern

Both `login/page.tsx` and `reset-password/page.tsx` were `'use client'` files. Converted using the server wrapper pattern:

- `src/app/login/LoginClient.tsx` — new file containing the existing `'use client'` login logic (inner function renamed to `LoginClientInner`, exported as `LoginClient`)
- `src/app/login/page.tsx` — new server component exporting `metadata` with `noIndex: true`, renders `<LoginClient />`
- `src/app/reset-password/ResetPasswordClient.tsx` — new file containing existing `'use client'` reset logic (inner function renamed to `ResetPasswordClientInner`, exported as `ResetPasswordClient`)
- `src/app/reset-password/page.tsx` — new server component exporting `metadata` with `noIndex: true`, renders `<ResetPasswordClient />`

---

### J. `src/app/about/page.tsx` — Converted to server component with metadata

**Change:** About page was `'use client'` with no `metadata` export.

- `src/app/about/AboutClient.tsx` — new file containing existing `'use client'` about page content, exported as `AboutClient`
- `src/app/about/page.tsx` — rewritten as server component with proper `buildMetadata` export (title: "About SavDown", canonical: `/about`)

---

## Files Changed

| File | Description |
|---|---|
| `src/app/robots.ts` | Explicit per-crawler allow/disallow rules for 9 AI crawlers + expanded private paths |
| `src/app/sitemap.ts` | Added /reviews and /affiliates to static routes |
| `src/lib/seo.ts` | Added `organizationSchema()`, `websiteSchema()`, `howToSchema()` helpers |
| `src/app/layout.tsx` | Emit Organization + WebSite JSON-LD in `<head>` |
| `src/components/tools/ToolPage.tsx` | Emit HowTo JSON-LD for downloader tools |
| `src/components/tools/FunctionalToolLayout.tsx` | Emit HowTo JSON-LD for functional tools |
| `src/components/tools/GenericToolPage.tsx` | Emit SoftwareApplication JSON-LD (PreOrder) for coming-soon tools |
| `src/app/workspace/page.tsx` | Added noIndex metadata export |
| `src/app/workspace/activity/page.tsx` | Added noIndex metadata export (rewritten cleanly) |
| `src/app/workspace/batch/page.tsx` | Added noIndex metadata export (removed duplicate) |
| `src/app/workspace/collections/page.tsx` | Added noIndex metadata export (removed duplicate) |
| `src/app/workspace/downloads/page.tsx` | Added noIndex metadata export (rewritten cleanly) |
| `src/app/workspace/files/page.tsx` | Added noIndex metadata export (removed duplicate) |
| `src/app/workspace/settings/page.tsx` | Added noIndex metadata export (replaced bare title export, cleaned imports) |
| `src/app/workspace/billing/page.tsx` | Added noIndex metadata export (replaced bare title export, cleaned imports) |
| `src/app/workspace/pricing/page.tsx` | Added noIndex metadata export (replaced bare title export) |
| `src/app/login/page.tsx` | New server component wrapper with noIndex metadata |
| `src/app/login/LoginClient.tsx` | New file — existing 'use client' login content |
| `src/app/reset-password/page.tsx` | New server component wrapper with noIndex metadata |
| `src/app/reset-password/ResetPasswordClient.tsx` | New file — existing 'use client' reset-password content |
| `src/app/about/page.tsx` | New server component wrapper with about metadata |
| `src/app/about/AboutClient.tsx` | New file — existing 'use client' about content |

---

## What Was NOT Changed

- **Middleware** (`src/middleware.ts`): No crawler blocking found — left untouched.
- **next.config.js**: No X-Robots-Tag: noindex headers found on public paths — left untouched.
- **Catalog keywords** (plan item 8): Skipped — the catalog.ts `CatalogTool` type is used across many components and adding a `keywords` field would require type changes across the codebase. The `[slug]/page.tsx` already passes `keywords` for downloader tools (from `tools.ts`). Catalog tools inherit site-wide keywords via `buildMetadata` defaults. This is a low-priority gap that does not affect crawlability.
- **No AI API integrations** added.
- **No crawler names invented** — all 9 user-agents are from official provider documentation.
- **No existing SEO architecture replaced** — `buildMetadata`, `jsonLd`, `faqSchema`, `softwareAppSchema`, `breadcrumbSchema` unchanged.

---

## Remaining Limitations / Known Gaps

1. **Catalog tool keywords**: `CatalogTool` type has no `keywords` field; functional/catalog tool pages inherit site-wide keywords. Low impact — titles and descriptions are specific per tool.
2. **Workspace tools pages** (`/workspace/tools`, `/workspace/tools/[group]`, `/workspace/tools/[group]/[slug]`): Not audited for noIndex. These are authenticated workspace pages and should also have `noIndex: true`, but were not in the plan's scope.
3. **`buildMetadata` robots logic**: `noIndex=false, noFollow=false` correctly produces `index: true, follow: true` (verified in seo.ts — the `follow: noFollow ? false : !noIndex` logic when noIndex=false and noFollow=false gives `follow: true`).
4. **Sitemap lastModified**: All tool pages use `new Date()` — no per-tool timestamp differentiation. Acceptable without a CMS.
5. **Robots.txt is not a security boundary**: Private paths (/workspace, /account, etc.) are protected by server-side auth redirects in addition to robots.txt.

