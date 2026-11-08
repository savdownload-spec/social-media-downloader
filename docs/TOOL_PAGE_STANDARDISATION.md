# SavDown tool-page standardisation

Implementation handoff: 8 November 2026. Source review and live reference HTML inspection only; no local tests, lint, type-check, build, development server or browser testing was run. Nothing was committed, pushed, merged or submitted as a PR. The working tree was clean when work began.

## Coverage and master audit

All **59 catalog entries across seven categories** were audited against their route registration, interactive component, request path and processing implementation. The inventory consists of **18 registered downloaders, 39 registered functional tools and two catalog-only tools**. Registered does not mean a deployed dependency or a particular upstream source has been exercised successfully.

The approved [YouTube Video Downloader](https://getsavdown.com/tools/youtube-video-downloader#key-features) was fetched from the live site and its returned HTML headings inspected. Source inspection covered `ToolPage.tsx`, `ToolLongContent.tsx`, `ToolContentNav.tsx`, `ToolContentNav` anchors, `FAQSection`, the layout primitives, registries, metadata helpers and sitemap. The master contains:

1. Four-level breadcrumb and icon-led hero with the functional downloader.
2. Three introductory highlight cards.
3. Numbered workflow cards, format pills, accordion FAQs and related-tool cards.
4. About sidebar and contextual navigation beside Introduction and What This Tool Does.
5. Feature cards, distinct benefit cards, numbered best practices and two-column resources.
6. Platform pills, numbered use-case cards and tip cards.
7. Dark Why Choose panel, conclusion and two final calls to action.

Its visual system uses `Container`, `Section`, `SectionHeading`, `type-page-title`, `type-section-title`, the existing gradient, surface, border and text tokens, rounded cards and the existing responsive grid breakpoints. Those primitives and class treatments remain the reference. No new color system, global CSS or processing UI was introduced.

The master’s original registry entry and long-form article content are preserved. Its shared related-tools block now filters unavailable recommendations and replaces the inaccurate blanket claim that every related tool needs no signup. This is the shared-component correction affecting the master. Existing master-specific claims in its inherited trust/reassurance copy were not rewritten; these include speed, privacy and daily-limit wording that conflicts with account-aware behavior. They are excluded from the new non-master copy and remain a separate editorial decision for the approved master.

The other **58 pages** now receive the complete structure, including the two availability pages. Administrative status overlays remain deliberate exceptions: an administrator-blocked processor still shows its status screen instead of pretending it can process input.

Before this change, the master already contained the complete reference structure. The other 17 registered downloaders shared much of its section layout but needed resource coverage and capability corrections. The 39 functional tools had abbreviated content; AI Image Generator additionally bypassed the shared layout through an explicit route. The two catalog-only pages had brief coming-soon layouts. Thus no non-master route was accepted as fully meeting the requested structural and factual standard without an update.

## All-tool audit inventory

“Full guide” below means the complete master-derived section sequence is connected. It is not a runtime pass result.

| # | Tool / route slug | Implementation inspected | Result and material adaptation |
|---|---|---|---|
| 1 | `youtube-video-downloader` | DownloaderForm, download API, yt-dlp, merge delivery | Approved master retained; shared availability-aware related tools. |
| 2 | `youtube-shorts-downloader` | DownloaderForm, yt-dlp | Full guide; source dimensions rather than a fixed 1080×1920 or duration promise. |
| 3 | `youtube-playlist-downloader` | Catalog, both processor registries, playlist option declaration | Full availability guide; no registered processor, enumeration or playlist ZIP. |
| 4 | `youtube-thumbnail-downloader` | Thumbnail resolver and video-ID parsing | Full guide; actual JPG candidates and MaxRes check; no frame picker. |
| 5 | `youtube-to-mp3` | Audio-only yt-dlp branch | Full guide; local results are M4A/WebM, without YouTube MP3 transcoding. |
| 6 | `tiktok-video-downloader` | yt-dlp, TikTok stream route | Full guide; source MP4 choices, no universal embedded-watermark-removal claim. |
| 7 | `tiktok-to-mp3` | TikTok stream audio extraction | Full guide; real local MP3 encoding is fixed at 192 kbps. |
| 8 | `tiktok-thumbnail-downloader` | Metadata-thumbnail resolver | Full guide; source image is labeled JPG without transcoding or format verification. |
| 9 | `tiktok-photo-downloader` | Standard TikTok resolver and image fallback | Full guide; best-effort individual entries, no verified photo ZIP. |
| 10 | `instagram-reels-downloader` | Registered Instagram downloader, yt-dlp | Full guide; direct eligible video paths, no private-session access or overlay editor. |
| 11 | `instagram-video-downloader` | Catalog and processor registries | Full availability guide; this exact slug has no processor or alias. Points to the existing Reels route. |
| 12 | `instagram-photo-downloader` | gallery-dl dispatch and result construction | Full guide; individual media, 35-entry cap, missing gallery ZIP endpoint disclosed. |
| 13 | `instagram-story-downloader` | gallery-dl dispatch | Full guide; current accessible Stories only, no expiry recovery or anonymity claim. |
| 14 | `instagram-profile-picture-downloader` | Metadata-thumbnail dispatch | Full guide; generic thumbnail candidate, no independently verified HD-avatar workflow. |
| 15 | `facebook-video-downloader` | Facebook URL configuration, yt-dlp and delivery | Full guide; public source-dependent video, no group/session bypass or live capture. |
| 16 | `facebook-reels-downloader` | Facebook video path | Full guide; no embedded-overlay removal or fixed vertical dimensions promised. |
| 17 | `x-video-downloader` | X URL configuration, yt-dlp | Full guide; MP4 choices; actual GIF conversion belongs to the GIF route. |
| 18 | `x-gif-downloader` | Resolver, URL-to-GIF route, video service | Full guide; MP4 or real GIF; GIF defaults 12 fps/480 px, first 10 seconds, 20 MB cap. |
| 19 | `pinterest-video-downloader` | Pinterest URL configuration and yt-dlp | Full guide; single Pin and returned video choices, no board archive. |
| 20 | `pinterest-image-downloader` | Default dispatch and yt-dlp branches | Full guide with implementation warning; no dedicated local Pinterest image branch; remote behavior unverified. |
| 21 | `background-remover` | Browser component, client and worker | Full guide; JPG/PNG/WebP ≤10 MB, local mask processing, transparent PNG, model-load requirements. |
| 22 | `image-upscaler` | Component, worker/client, input limits and receipt API | Full guide; 2×/4×, ≤5 MB, output ≤4,194,304 pixels, input side ≤2048; credit receipts distinguished from pixels. |
| 23 | `image-enhancer` | ImageTool and Sharp enhancement path | Full guide; fixed brightness/saturation/sharpening, no generative restoration. |
| 24 | `image-compressor` | Batch component/API, Sharp and batch config | Full guide; ≤25 MB/file, ≤100 MB/batch, 50 MP, plan count, quality, actual format behavior and ZIP. |
| 25 | `image-resizer` | ImageTool/API and resize service | Full guide; proportional inside fit, no enlargement, width/height are bounds rather than a forced crop. |
| 26 | `image-converter` | ImageTool/API and conversion service | Full guide; JPEG/PNG/WebP/GIF/AVIF outputs, fixed conversion quality, JPEG flattens to white. |
| 27 | `jpg-to-png` | Dedicated Sharp operation | Full guide; actual PNG encoding, no restoration or automatic transparency. |
| 28 | `png-to-jpg` | Dedicated Sharp operation and quality control | Full guide; lossy JPEG, white alpha flattening and adjustable quality. |
| 29 | `webp-converter` | to-WebP operation and control visibility | Full guide; this page converts to WebP; reverse conversion uses Image Converter. |
| 30 | `heic-to-jpg` | HEIC decoder, uploader and JPEG path | Full guide; still-image conversion, fixed quality, no promised Live Photo/HDR/depth preservation. |
| 31 | `video-converter` | VideoTool/API and FFmpeg service | Full guide; ≤100 MB, five containers, no user codec/resolution controls or guaranteed combinations. |
| 32 | `video-compressor` | VideoTool and compression branch | Full guide; CRF 18–40, H.264 MP4/AAC 128k; no lossless or exact-size claim. |
| 33 | `video-to-mp3` | Audio extraction branch | Full guide; uploaded video to MP3 at 128/192/320 kbps; no trimming or denoising. |
| 34 | `gif-maker` | VideoTool and GIF encoding branch | Full guide; video input, not an image-sequence builder; 5–24 fps, first 10 seconds. |
| 35 | `mp4-to-gif` | Shared GIF component/service | Full guide; default width 480, ≤20 MB GIF, no timeline or width control in the UI. |
| 36 | `merge-pdf` | PdfTool, merge API and PDF-LIB service | Full guide; file ordering, at least two sources, complete-page copying, one combined operation. |
| 37 | `split-pdf` | Split controls/API/service | Full guide; extract, ranges, every-N, every-page and approximate-size modes; separate parts and ZIP. |
| 38 | `compress-pdf` | Compression controls/service | Full guide; structural rewrite and selected metadata fields; no implemented image downsampling. |
| 39 | `pdf-to-word` | Office conversion API/service | Full guide; engine/filter-dependent DOCX, no OCR or guaranteed layout reconstruction. |
| 40 | `word-to-pdf` | Engine detection, full and basic paths | Full guide; DOC/DOCX with full engine, DOCX-only practical basic fallback ≤20 MB and reduced fidelity. |
| 41 | `jpg-to-pdf` | Image-to-PDF API/service | Full guide; centered image per A4 page, JPEG 90 intermediary, no enlargement or OCR. |
| 42 | `pdf-to-jpg` | PdfTool/API and pdftoppm invocation | Full guide; first N pages, maximum 50, 144 DPI; no arbitrary page range or DPI control. |
| 43 | `ai-thumbnail-generator` | AIImageGenerator and provider route | Full guide; same prompt-to-image UI, no video analysis, title-overlay editor or fixed thumbnail export. |
| 44 | `ai-background-remover` | Shared browser cutout component | Full guide; same local segmentation as Background Remover, no separate remote remover. |
| 45 | `ai-image-enhancer` | Functional registry and missing ImageTool slug mapping | Full guide; actual compression fallback, no dedicated AI enhancement; processors unchanged. |
| 46 | `ai-youtube-title-generator` | AiTextTool and prompt/API | Full guide; topic/audience/tone, model asked for five drafts, no CTR or channel analytics. |
| 47 | `ai-description-generator` | Text brief, key points and prompt/API | Full guide; requested three drafts, no URL summary or verified timestamps. |
| 48 | `ai-hashtag-generator` | Hashtag mode and prompt/API | Full guide; requested fifteen terms, optional platform, no tone UI or live trend data. |
| 49 | `ai-caption-generator` | Caption brief/tone and prompt/API | Full guide; written description only, no photo analysis, scheduling or publishing. |
| 50 | `ai-image-generator` | Explicit page, shared generator, API/provider/config | Full guide; explicit route now delegates to common metadata/status/layout; interactive generator retained. |
| 51 | `meta-title-generator` | SeoTool and local title templates | Full guide; topic/brand, truncation at 60 characters, no AI model, crawl or rankings. |
| 52 | `meta-description-generator` | Local description templates | Full guide; topic/CTA, truncation at 160 characters, no page summarization. |
| 53 | `youtube-tags-generator` | Local token/modifier logic | Full guide; 500-character comma budget, ASCII-oriented cleaning, no trend or volume API. |
| 54 | `keyword-generator` | Local modifier groups | Full guide; five ideation groups and placeholders, no volume/difficulty/CPC data. |
| 55 | `schema-generator` | Local schema fields and serializer | Full guide; six JSON-LD types, no installation or eligibility validator. |
| 56 | `qr-code-generator` | Component and credit-gated render API | Full guide; static PNG/SVG/base64, colors/margin/size/correction; successful previews also charge credits. |
| 57 | `qr-code-scanner` | Upload component/API, Sharp and jsQR | Full guide; ≤10 MB image, one decoded QR, no camera/general barcode/safety-verdict claim. |
| 58 | `color-picker` | EyeDropper and canvas sampler | Full guide; browser-dependent screen sampling, image fallback, HEX/RGB/HSL; no palette/contrast checker. |
| 59 | `gradient-generator` | CSS builder, stops and preview | Full guide; linear/radial/conic CSS, presets and stops; no raster export or contrast validation. |

## Section adaptations

- “Supported formats” becomes formats/capabilities for text, CSS, QR and schema tools. Green format pills describe actual outputs, including explicit unavailability where necessary.
- “Supported platforms” becomes inputs and compatibility for non-URL tools; downloaders list accepted host/path patterns and restrictions.
- Unimplemented routes retain all section positions but use an availability workflow, current capabilities and related-live-tool CTA. They do not render a fake processor or SoftwareApplication/HowTo schema.
- Why Choose panels use controls, processing/privacy and usage facts rather than speed, anonymity or unlimited-use promises.
- Resource sections link published articles with an exact matching `toolSlug`. Where none exist, service/privacy links replace a fabricated guide list. Official references remain separate.
- Final CTAs return to the real interface; unavailable pages point to related live tools.

## Architecture and SEO

- `FunctionalToolLayout` now supplies the master-derived hero, trust indicators, workflow, format/capability pills, FAQ, related tools and full article. `ToolLongContentSection` remains the single long-form presentation component used by both downloader and functional pages.
- The original functional React components are passed through as children. No processing API, model worker, output algorithm, credit ledger or upload service was changed.
- `toolGuide.ts` defines the complete content contract and shared processing policies. Six functional-category data files plus the downloader data file contain individual input/output/settings/limits/workflow/features/benefits/advice/FAQ/use-case content. `toolGuideEndings.ts` contains independently edited positioning and conclusions.
- `toolGuides.ts` collects 58 non-master entries. `ToolPageSlug` derives from that inventory; both catalog and downloader registration require that type. A new page cannot be registered under a new slug without its content entry. Missing non-master runtime guides fail explicitly rather than silently omitting sections.
- `toolContent.ts` preserves the master article and exposes the audited inventory to search/support consumers. `functionalToolContent.ts` projects functional workflow/FAQ summaries from the same source. Downloader registry exports and catalog descriptions also use audited copy so old claims do not remain the public source of truth.
- Existing routes are preserved. The explicit AI Image Generator route delegates with its fixed slug to the common metadata and page resolver, including admin status handling.
- Titles and descriptions are unique by tool. Existing `buildMetadata` supplies canonical `https://getsavdown.com` URLs, Open Graph and Twitter metadata. No new global social-image assets were introduced; existing social-image alt text remains.
- Registered, available tools emit application, breadcrumb and visible-workflow schema. Credit-gated tools do not receive a fabricated zero-price offer in the new content path. No fabricated rating/review data was introduced.
- New non-master pages keep visible FAQs without assuming eligibility for FAQ search enhancements. The approved master’s existing FAQ schema is preserved. Consult current [Google Search structured-data documentation](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data) when revisiting this policy.
- Unimplemented and administrator-blocked tool pages are noindex and excluded from the tool sitemap; registered available pages remain included. Related recommendations apply the same persisted availability filter and exclude the current tool.
- DB lookup failure follows the repository’s existing fail-open availability convention. A transient DB failure can therefore leave the last authoritative administrative state unknown; availability filtering is not a deployment health probe.

## Unverified capabilities and dependencies

No processor was executed locally or against the live site. Source inspection establishes code paths, not successful production operation. Live review must confirm deployed binary/model assets, credentials, provider mode, account plans, current limits, storage configuration, extractor support and current upstream access.

Particularly important dependencies are yt-dlp or a remote resolver, gallery-dl, FFmpeg, pdftoppm, LibreOffice conversion filters, private Blob uploads and cleanup, model/runtime browser assets, and configured Cloudflare models. `AI_PROVIDER` also supports a mock mode; production configuration was not inspected or assumed. PDF-to-DOCX success cannot be promised solely because LibreOffice is installed.

No verified retention deadline exists for temporary PDF uploads. Interrupted requests or best-effort deletion failures can leave objects behind. Video temporary-directory cleanup is attempted; account operation, source and credit records persist. The new content distinguishes those behaviors from local background removal and local upscaling.

Existing problems were documented rather than repaired as unrelated functionality work: missing playlist and Instagram-video processors, missing gallery ZIP delivery, missing local YouTube-to-MP3 transcoding, best-effort TikTok slideshow extraction, generic profile-thumbnail lookup, missing dedicated local Pinterest-image extraction, the AI-enhancer compression fallback, QR preview billing and engine-dependent Office conversion.

Most tools do not have a dedicated published SavDown article associated with their slug. No new article routes were invented. Existing blog article copy itself was not rewritten and may contain older usage claims; the current tool guide and processing interface should be reviewed alongside any linked article.

Authoritative external endpoints were inspected where accessible: MDN format/CSS/EyeDropper references, Google metadata/YouTube references, Schema.org, Cloudflare, PDF-LIB, DENSO WAVE, jsQR, Pinterest and X. Automated retrieval of the canonical FFmpeg documentation timed out; Instagram returned rate limiting, TikTok redirected to an inaccessible support endpoint, and Facebook redirected to login. These official links are retained for manual live review; their unauthenticated accessibility was not claimed as verified.

## Files changed

Existing files:

- `src/app/sitemap.ts`
- `src/app/tools/[slug]/page.tsx`
- `src/app/tools/ai-image-generator/page.tsx`
- `src/components/tools/FunctionalToolLayout.tsx`
- `src/components/tools/GenericToolPage.tsx`
- `src/components/tools/ToolLongContent.tsx`
- `src/components/tools/ToolPage.tsx`
- `src/components/tools/ToolStatusOverlay.tsx`
- `src/components/tools/resolveToolPage.tsx`
- `src/config/catalog.ts`
- `src/config/functionalToolContent.ts`
- `src/config/toolContent.ts`
- `src/config/tools.ts`
- `src/lib/search/indexBuilder.ts`

New files:

- `src/components/tools/RelatedToolSection.tsx`
- `src/config/toolGuide.ts`
- `src/config/toolGuideEndings.ts`
- `src/config/toolGuides.ts`
- `src/config/toolGuidesDownloaders.ts`
- `src/config/toolGuidesImage.ts`
- `src/config/toolGuidesVideo.ts`
- `src/config/toolGuidesPdf.ts`
- `src/config/toolGuidesAi.ts`
- `src/config/toolGuidesSeo.ts`
- `src/config/toolGuidesUtility.ts`
- `src/lib/toolPageAvailability.ts`
- `docs/TOOL_PAGE_STANDARDISATION.md`

## Live review checklist

1. Compare the master with Image Compressor, Split PDF, AI Caption Generator, Schema Generator and Gradient Generator. Confirm the same composition, spacing, card treatment and visual hierarchy.
2. Confirm the full section sequence, article navigation, anchors and final interface/related-tool CTAs. Check the two unavailable pages and any administrator-blocked tool separately.
3. Review tool-specific facts, especially resize bounds, GIF duration/default width, PDF structural compression, local/server processing, AI-enhancer fallback, YouTube audio formats and QR preview charges.
4. Exercise existing interfaces with eligible inputs and accounts. Check success, validation, auth, insufficient-credit, rate-limit, partial-batch failure, retry and download behavior without assuming every upstream source is supported.
5. Open FAQ accordions, related tools, published guide links and official resources. Confirm no self recommendation, unavailable recommendation or fabricated article; manually review the access-restricted official links noted above.
6. Inspect each sampled page’s title, description, single H1, heading hierarchy, canonical, Open Graph, Twitter metadata and JSON-LD. Confirm live tools are in the sitemap and unavailable/blocked pages are noindex and omitted.
7. Check desktop, tablet and mobile layouts, especially long capability pills, navigation, upload controls, multi-file results and the AI image interface.
8. Repeat key visual checks in light and dark themes, including focus states, FAQ interaction, contrast and dark reassurance panels.
9. For a future tool, add its complete guide and ending copy, then register its catalog/processor entry. Confirm the shared page supplies the complete structure without a copied layout file.

No live deployment was made from this workspace. Compilation, runtime behavior, responsive rendering and actual output quality remain for the requested deployment review.
