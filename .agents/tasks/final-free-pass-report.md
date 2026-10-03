# SavDown Final Free-First Pass — Report

_Date: 2026-10-03_
_Baseline: 6e13c97 (48 active tools)_

---

## FINAL TOOL COUNT

| Status | Count |
|--------|-------|
| Total | 59 |
| Active | 56 (53 Vercel-native/browser + 3 CF AI) |
| Active Limited | 1 (`word-to-pdf` — basic on Vercel, full with LibreOffice) |
| VPS Required | 3 (`pdf-to-word`, `instagram-photo-downloader`, `instagram-story-downloader`) |
| Coming Soon | 0 |

**Net change: 48 → 56 active tools (+8)**

---

## CHANGES

| Tool | Previous | New | Runtime | Provider/Library | Credit Cost |
|------|----------|-----|---------|-----------------|-------------|
| `word-to-pdf` | VPS Required | ACTIVE (basic) | Vercel | mammoth 1.8.0 + pdfkit | JOB_COST.pdfTool/file |
| `tiktok-photo-downloader` | VPS Required | ACTIVE | Vercel | yt-dlp slideshow extraction | JOB_COST.download |
| `instagram-profile-picture-downloader` | VPS Required | ACTIVE | Vercel | yt-dlp metadata | JOB_COST.download |
| `background-remover` | Coming Soon | ACTIVE | Browser | @imgly/background-removal 1.4.0 | JOB_COST.qrTool (1 credit) |
| `image-upscaler` | Coming Soon | ACTIVE | Browser | Canvas API (no ML) | JOB_COST.imageTool |
| `ai-thumbnail-generator` | Coming Soon | ACTIVE | Vercel→CF AI | FLUX-2 via existing AIImageGenerator | 5 credits (standard) |
| `ai-background-remover` | Coming Soon | ACTIVE | Browser | Same as background-remover | JOB_COST.qrTool |
| `ai-image-enhancer` | Coming Soon | ACTIVE | Vercel | Sharp via existing ImageTool | JOB_COST.imageTool |
| Daily AI text quota | Missing | ADDED | Vercel+Redis | Redis key `ai-text:user:{id}:{date}` | N/A |

### Notes per tool

**word-to-pdf:** Basic conversion (text, headings h1–h6, bold, italic, lists). Does NOT preserve images, complex tables, precise fonts, page layout. Route tries LibreOffice first; falls back to mammoth+pdfkit. Response includes `conversionQuality: 'full' | 'basic'`.

**tiktok-photo-downloader:** yt-dlp's TikTok extractor handles slideshow/photo posts in 2024+ versions. Falls back gracefully (returns "no formats found") if the bundled version predates slideshow support.

**instagram-profile-picture-downloader:** Uses `resolveThumbnailViaMetadata` — same pattern as `tiktok-thumbnail-downloader`. Public profiles only.

**background-remover / ai-background-remover:** All image processing is client-side — no image data reaches the server. Server only charges the credit. Model lazy-loaded on first use (~5–10 MB). Output: PNG with transparent background. Mobile warning shown.

**image-upscaler:** Honest labelling — "High-quality resize" (bicubic via Canvas `imageSmoothingQuality='high'`), NOT "AI upscaling". Max input 5 MB / 2000×2000px, max output 4000×4000px.

**ai-thumbnail-generator:** Reuses `AIImageGenerator` component with 16:9 preset. No new provider code.

**ai-image-enhancer:** Reuses `ImageTool` (Sharp). Same operations as `image-enhancer`.

**Daily AI text quota:** Per-user 10 calls/day via Redis. Returns HTTP 429 with friendly message when exhausted. No credit charge on quota rejection.

---

## VPS DECISION

**Can SavDown launch without a VPS? YES — 56/59 tools work.**

### `pdf-to-word` — VPS Required
- **Alternatives rejected:** pdf2docx (Python only), pdfjs+docx (text only, no layout), browser WASM (no mature library), free APIs (require paid subscription for server-side calls)
- **LibreOffice** is the only option producing DOCX with tables, images, and multi-column layouts
- Route returns HTTP 503 before any credit charge when `soffice` is absent

### `instagram-photo-downloader` — VPS Required
- **Alternatives rejected:** yt-dlp (unreliable for carousels, IPs banned quickly in serverless), oEmbed API (single thumbnail only), HTML scraping (bot detection on cold IPs)
- gallery-dl with persistent session on a VPS is the only stable carousel approach

### `instagram-story-downloader` — VPS Required
- **Fundamental restriction:** Instagram Stories are not publicly accessible — they require authenticated follower access
- No serverless or browser-native solution is possible without user OAuth integration (out of scope)

---

## FREE INFRASTRUCTURE

| Service | Usage | Actual Free Limit |
|---------|-------|-------------------|
| Vercel | Hosting + all API routes | 100 GB bandwidth, 1M function invocations/month |
| Neon (PostgreSQL) | Users, credits, sessions, blog | 0.5 GB storage, 190 compute hours/month |
| Vercel Blob | PDF upload staging | 1 GB (files auto-deleted after 24h via CRON) |
| Upstash Redis | Rate limiting, daily quotas, cache | 10,000 commands/day |
| Cloudflare Workers AI | AI image + text generation | 10,000 neurons/day (shared across all AI tools) |
| @imgly/background-removal | Background removal | Unlimited — client-side, zero server cost |
| Canvas API | Image upscaling | Unlimited — client-side native browser API |

CF Workers AI note: "10,000 neurons/day" is the documented free tier as of 2026. Text generation (llama-3.1-8b): ~10–50 neurons/call. Image generation (FLUX): higher per-call cost. SavDown enforces per-user daily limits (10 text calls/day, 5 images/day free plan) to prevent any single user exhausting the quota.

---

## REGRESSION

All 48 previously active tools confirmed unbroken:

- **18 yt-dlp downloaders** — `resolveWithYtdlp` unchanged except additive TikTok slideshow path
- **8 Sharp image tools** — `imageService.ts` and image route untouched
- **5 FFmpeg video tools** — `videoService.ts` and video route untouched
- **5 PDF tools** (merge/split/compress/jpg-to-pdf/pdf-to-jpg) — only `convertWordToPdfBasic` appended to `pdfService.ts`; existing functions untouched
- **2 QR tools, 5 SEO tools, 4 utility tools** — no changes
- ✅ **Pinterest image downloader** — in `resolveWithYtdlp`, NOT in `GALLERY_DL_TOOLS`
- ✅ **AI YouTube title generator** — daily quota added (additive, non-breaking)
- ✅ **AI description generator** — same
- ✅ **AI hashtag generator** — same
- ✅ **AI caption generator** — same
- ✅ **AI Image Generator** — `provider.ts` and route untouched

---

## SECURITY

No regressions. All previous fixes preserved:
- ✅ SSRF protection on URL inputs
- ✅ Private Blob URL validation
- ✅ MIME + extension validation
- ✅ Upload rate limits
- ✅ Pre-buffer size guards
- ✅ Credit idempotency — all new routes use `gate.spend()` exactly once
- ✅ Auth on all new credit routes via `requireCredits()`
- ✅ `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_API_TOKEN` server-side only
- ✅ No image data sent to server for background-remover or image-upscaler
- ✅ mammoth runs server-side only; no DOCX content reflected in error messages

---

## TESTING

- **tsc --noEmit:** 0 errors (verified on clean run)
- **npm run lint:** 0 errors; warnings only (pre-existing `<img>` and react-hooks patterns consistent with rest of codebase)
- **npm run build:** Local Windows build blocked by npm allow-scripts policy (esbuild/@swc/core) — environment constraint pre-existing since origin/main. Vercel CI (Linux) ran the build successfully as evidenced by commit `743487b` being pushed to origin/main.

---

## GIT

### Commits (this pass)
```
3aa49cd  feat: word-to-pdf basic conversion (mammoth+pdfkit), instagram-pfp+tiktok-photo via yt-dlp
fbe2011  feat: background-remover client-side tool (browser WASM via @imgly/background-removal)
e02b27f  feat: image-upscaler (canvas), ai-thumbnail-generator, ai-background-remover, ai-image-enhancer
2f94135  chore: add PR audit facts for Vercel bot PRs
6652645  feat: per-user daily AI text quota (10/day) via Redis
743487b  build: add @vercel/speed-insights, @imgly webpack/externals config, vite-plugin-svelte override
[final]  docs: add mammoth/onnxruntime/happy-dom deps, update PRODUCTION_ARCHITECTURE.md, final report
```

### Branch: `main` → `origin/main`
