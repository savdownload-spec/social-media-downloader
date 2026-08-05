# Complete i18n Implementation Plan

## Overview
Complete the multilingual support for the entire website across all 12 languages (en, es, fr, de, pt, hi, ar, ja, ko, zh, tr, ru). The next-intl infrastructure is already in place — the work is: adding missing translation keys, translating all hardcoded strings, and wiring components to use the translation system.

---

## Phase 1: Cleanup & Foundation
1. **Delete dead code**: Remove `src/i18n/LanguageContext.tsx` and `src/i18n/useTranslation.ts` (zero consumers)
2. **Deduplicate `locales`**: Have `src/i18n/index.ts` re-export from `src/i18n.ts` instead of defining a duplicate array
3. **Add missing keys to `en.json`**:
   - `hero.badges.privacyFirst`, `hero.badges.everyPlatform`, `hero.stats.free`, `hero.stats.dataStored`, `hero.stats.rating`
   - `footer.stayInLoop`, `footer.stayInLoopDesc`, `footer.whySavDown`, `footer.noSignup`
   - `common.faq`, `common.or`, `common.readMore`, `common.and`, `common.all`
   - `catalog.title`, `catalog.subtitle`, `catalog.footerDesc`
   - `faqs.stillCurious`, `faqs.fullFaq`
   - `newsletter.errorTitle`, `newsletter.subscribed`
   - `compatibility.devices` (array of 3), `compatibility.browsers` (array of 6)
   - New sections: `testimonials` (eyebrow, title, description, 4 items), `useCases` (eyebrow, title, description, 4 items)
   - New sections: `pricing` (full pricing page), `searchPage` (search UI strings), `toolsPage` (tools index strings), `dmcaPage` (full DMCA page), `cookiesPage` (full cookies page), `privacyPage` (full privacy page), `termsPage` (full terms page), `pricingPage` (full pricing page), `faqPage` (FAQ page hero strings)

## Phase 2: Wire Home Components to Translation System
4. **Hero.tsx**: Replace 5 hardcoded strings (`'Privacy-first'`, `'Every platform'`, `'Free'`, `'Data stored'`, `'Rating'`) with `t()` calls
5. **Compatibility.tsx**: Add `useTranslation` import, replace all hardcoded strings with `t()` calls
6. **Testimonials.tsx**: Add `useTranslation` import, replace all hardcoded strings with `t()` calls
7. **UseCases.tsx**: Add `useTranslation` import, replace all hardcoded strings with `t()` calls

## Phase 3: Wire Legal & Info Pages to Translation System
8. **cookies/page.tsx**: Add i18n imports, replace ~40 hardcoded strings with `t()` calls (use `getTranslations` server-side)
9. **dmca/page.tsx**: Same approach, ~35 strings
10. **privacy/page.tsx**: Same approach, ~60 strings
11. **terms/page.tsx**: Same approach, ~50 strings
12. **pricing/page.tsx**: Same approach, ~45 strings (convert to client or keep server with `getTranslations`)
13. **faq/page.tsx**: Same approach, wire both page strings and FAQ config data
14. **search/page.tsx**: Add `useTranslation`, replace ~15 hardcoded strings

## Phase 4: Move Tools Under [locale]
15. **Move `src/app/tools/` → `src/app/[locale]/tools/`**: Move both `page.tsx` and `[slug]/page.tsx`
16. **Wire tools pages to i18n**: Replace hardcoded English with `t()` calls
17. **Update middleware matcher**: Add `/tools` path pattern
18. **Fix FAQ config**: Move `src/config/faqs.ts` content into translation files or make it i18n-aware

## Phase 5: Complete All Translation Files
19. **Auto-translate all 11 non-English JSON files**: Use a Node.js script to generate translations for all missing keys in all 11 languages. The script will:
   - Start from the complete `en.json`
   - For each non-English locale, preserve existing translations (don't overwrite)
   - Fill in only the missing keys using a translation API or manual translation mappings
   - Ensure all locales have identical key structure to `en.json`
20. **Validate**: Run a script to verify all 11 locales have the same key structure as `en.json`

## Phase 6: SEO & Polish
21. **Generate per-page metadata**: Ensure `generateMetadata` in each page uses translations for `title` and `description`
22. **Verify hreflang alternates**: Confirm locale layout generates correct alternates for all pages
23. **Remove all `|| 'fallback'` patterns**: Once translations are complete, clean up fallback strings in components

---

## Execution Strategy
- **Phases 1-4** are code changes (editing TSX files and en.json)
- **Phase 5** is bulk translation work — a Node.js script will auto-translate missing keys for all 11 languages, with the complete en.json as the source of truth
- **Phase 6** is cleanup and validation
- Total estimated changes: ~15 TSX files edited, 1 en.json significantly expanded, 11 non-English JSON files completed

## Files Changed (estimated)
- `src/i18n/translations/en.json` — add ~300+ new keys
- `src/i18n/translations/{es,fr,de,pt,hi,ar,ja,ko,zh,tr,ru}.json` — fill all missing keys
- `src/components/home/Hero.tsx` — 5 string fixes
- `src/components/home/Compatibility.tsx` — full i18n wiring
- `src/components/home/Testimonials.tsx` — full i18n wiring
- `src/components/home/UseCases.tsx` — full i18n wiring
- `src/app/[locale]/cookies/page.tsx` — full i18n wiring
- `src/app/[locale]/dmca/page.tsx` — full i18n wiring
- `src/app/[locale]/privacy/page.tsx` — full i18n wiring
- `src/app/[locale]/terms/page.tsx` — full i18n wiring
- `src/app/[locale]/pricing/page.tsx` — full i18n wiring
- `src/app/[locale]/faq/page.tsx` — full i18n wiring
- `src/app/[locale]/search/page.tsx` — full i18n wiring
- `src/app/[locale]/tools/` — moved and wired (2 files)
- `src/i18n/LanguageContext.tsx` — deleted
- `src/i18n/useTranslation.ts` — deleted
- `src/i18n/index.ts` — deduplicated
- `src/middleware.ts` — matcher updated
- Translation helper script (temporary)