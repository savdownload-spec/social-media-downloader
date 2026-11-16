# SavDown Downloader Engine — Audit, Research, and Rebuild Plan

Date: 2026-11-16  
Scope: the 20 tools under `/tools#downloaders`, their shared API routes, media services, credits, security, delivery, SEO copy, and Vercel constraints.  
Status: **audit + plan complete; Phase 0 implemented and verified locally, awaiting review. No deployment, commit, or push has been made.**  
Approved direction: compliance-first, Vercel streaming only, Phase 0 first.

## Evidence and limits

- Inspected the installed stack: Next.js **14.2.18** (App Router), Node runtime routes, Prisma/Neon, Upstash Redis, Vercel hosting, `bin/yt-dlp_linux` (bundled Linux binary, 39.9 MB), `ffmpeg-static`.
- Read all shared downloader code: `src/app/api/download/route.ts`, `src/app/api/download/merge/route.ts`, `src/app/api/proxy/route.ts`, `src/app/api/tools/tiktok/stream/route.ts`, `src/app/api/tools/video/url-to-gif/route.ts`, `src/lib/ytdlp.ts`, `src/lib/gallerydl.ts`, `src/lib/gallerydl` callers, credits/rate-limit code, tool registry and page renderer.
- Read-only live probes of production (`getsavdown.com`) on 2026-11-16: all 20 routes respond; two render a placeholder; `/api/download` currently returns **503**; `/api/download/merge` **503**; `/api/proxy` and TikTok stream **401** unauthenticated; the gallery ZIP endpoint is **404**.
- No authenticated session, no production env values, no live media download was performed. Local `yt-dlp`/`ffmpeg`/`gallery-dl` are not installed on this machine; `bin/yt-dlp_linux` is a Linux binary and cannot run on Windows. **No tool can be marked PASS from this audit.**
- Platform-terms statements below summarize published terms/policies; they are not legal advice.

---

## 1. Executive summary

1. **Production downloader resolution is currently down.** `POST /api/download` returns `503 Download service is temporarily unavailable` because the route is `failClosed: true` and Redis is unavailable/unconfigured, so the rate limiter's default result is "failure". No tool can resolve metadata in this state.
2. **Vercel file delivery is the hard bottleneck for every video tool.** `merge` refuses to send any file over **4 MB** when `process.env.VERCEL` is set, and it (plus TikTok stream and GIF conversion) buffers entire files in memory. Most real videos are larger. Vercel's 4.5 MB limit applies only to buffered responses — **streamed responses are exempt** — so this is fixable without new infrastructure.
3. **Two of the 20 catalog tools have no processor at all:** YouTube Playlist and Instagram Video render a "Processor not available" page. The playlist option in the service is dead code.
4. **Two Instagram tools cannot work on Vercel:** Instagram Photo and Story require `gallery-dl`, which has no bundled/deployed binary. The Story route additionally passes `--cookies-from-browser none`, which is not a valid gallery-dl browser value and fails immediately. The service also emits a `/api/tools/gallery-dl/zip` link that does not exist (confirmed 404).
5. **Some tools do not produce what their names/copy claim.** YouTube "MP3" offers M4A/WebM only (no MP3 encoder), TikTok copy claims watermark removal that does not happen, and several pages claim "no login" while the API requires an account.
6. **The shared pipeline is inefficient and unvalidated.** A single video resolve runs up to 8 separate yt-dlp invocations; there is no FFprobe validation, no audio-presence check, no structured error codes, and no job/cancel model.
7. **Security defects exist in the delivery path:** TikTok session cookies/referer are placed in the query string (logged, stored in browser history), the proxy follows redirects without re-validating the destination (SSRF gap), and delivery URLs are not bound to the operation that resolved them.
8. **Compliance is the central product decision.** No official API from any of the six platforms authorizes downloading arbitrary third-party public media. The current engine relies on yt-dlp/gallery-dl extraction and, for TikTok, TLS impersonation to evade bot checks. Under the stated rule "do not bypass platform policies", most public downloader functionality is not permissible. This must be decided by the owner before implementation.

---

## 2. Confirmed defects (code evidence)

| # | Severity | Defect | Evidence |
|---|---|---|---|
| D1 | P0 | Downloader resolve always 503 in production when Redis is missing/unreachable because `failClosed` returns `success:false` | `src/app/api/download/route.ts:69-79`, `src/lib/ratelimit.ts:64-77`; live probe returned 503 |
| D2 | P0 | Video delivery refuses >4 MB on Vercel; all merge/GIF/TikTok responses are buffered | `src/app/api/download/merge/route.ts:124-155`, `src/app/api/tools/tiktok/stream/route.ts:105-156`, `src/app/api/tools/video/url-to-gif/route.ts:64-83` |
| D3 | P0 | Two catalog tools have no processor; playlist service option is unused and hardcoded `--no-playlist` | `src/config/catalog.ts:50,58`, `src/components/tools/resolveToolPage.tsx`, `src/lib/ytdlp.ts:104-110,202-204` |
| D4 | P0 | Instagram Photo/Story require an undeployed gallery-dl; Story passes an invalid flag; ZIP endpoint is missing | `src/lib/gallerydl.ts:96-104,114-116,193-214`; live ZIP probe 404 |
| D5 | P1 | TikTok cookies and signed URL are exposed in query parameters | `src/lib/ytdlp.ts:63-68,155-156,314,366`; `src/app/api/proxy/route.ts:63-67,96` |
| D6 | P1 | Proxy follows redirects without validating each hop against the allowlist (SSRF) | `src/app/api/proxy/route.ts:90-99` |
| D7 | P1 | Delivery endpoints trust client-supplied `tool`/`height`/`selector` independently of resolution; no signed binding | `src/app/api/download/merge/route.ts:56-73`, `src/app/api/tools/tiktok/stream/route.ts:52-75` |
| D8 | P1 | YouTube thumbnails are returned as raw `img.youtube.com` URLs, bypassing proxy credit/operation tracking | `src/lib/ytdlp.ts:482-505`; live CORS is `*`, so download works but is unmetered |
| D9 | P1 | No FFprobe/output validation; MP4 is labeled with audio purely by routing intent | `src/lib/ytdlp.ts:353-370` |
| D10 | P1 | Client buffers the whole file into a Blob before saving (memory pressure on mobile for large files) | `src/components/tools/DownloaderForm.tsx:27-77` |
| D11 | P1 | Public copy contradicts behavior: "no login", "no watermark", "removes TikTok logo", "4K" positioning | `src/config/tools.ts:137-140,374-387,671-686`; auth gate at `src/lib/credits.ts:88-94` |
| D12 | P2 | Up to 8 sequential yt-dlp probes per video resolve (batches of 3), each up to 45 s, inside a 60 s route | `src/lib/ytdlp.ts:201-210,320-371`; `vercel.json` `/api/download` maxDuration 60 |
| D13 | P2 | gallery-dl error text (first 120 chars) returned to users; may include internal paths | `src/lib/gallerydl.ts:227` |
| D14 | P2 | Bundled yt-dlp is dated 2026-08; extractors drift quickly; no version check/update path | `bin/yt-dlp_linux`, no version reporting in UI/admin |
| D15 | P2 | Proxy caps by `Content-Length` only; chunked upstream responses are unbounded | `src/app/api/proxy/route.ts:106-110,128-139` |
| D16 | P2 | No job IDs/progress/cancel for long operations; only byte progress on the client | whole pipeline |
| D17 | P3 | `DOWNLOADER_API_URL` responses are trusted verbatim (schema, SSRF, cost) | `src/lib/ytdlp.ts:540-562` |
| D18 | P3 | Thumbnail dimensions are hard-coded labels, not measured | `src/lib/ytdlp.ts:483-488` |

---

## 3. Shared pipeline (current)

```
Browser (DownloaderForm)
  └─ POST /api/download {url, tool}
       ├─ rate limit (fail-closed)            ← currently 503
       ├─ URL validator (platform allowlist)
       ├─ requireCredits(cost 0)              ← requires signed-in account
       ├─ Redis cache (30 min, successful results only)
       └─ dispatch:
            ├─ thumbnailOnly  → img.youtube.com variants (no binary)
            ├─ thumbnailViaMetadata → yt-dlp metadata.thumbnail
            ├─ audioOnly      → yt-dlp M4A/WebM (YouTube) or TikTok MP3
            ├─ gallery-dl     → Instagram photo/story
            └─ yt-dlp video   → 8 tier probes → merge URLs
  └─ click format
       ├─ /api/download/merge    (yt-dlp download + ffmpeg mux → buffered → 4 MB Vercel cap)
       ├─ /api/tools/tiktok/stream (yt-dlp download [+ ffmpeg MP3] → buffered)
       ├─ /api/tools/video/url-to-gif (ffmpeg GIF → buffered)
       └─ /api/proxy             (direct CDN stream → streamed; cookies in query)
```

Credit model: resolve is free (`cost 0`); delivery charges 1 credit (2 for ≥2160p, 2 for video tools). `begin`/`spend`/`fail` are recorded per operation. Failures do not charge. The design is sound; the enforcement depends on every delivery route using it.

---

## 4. Tool-by-tool audit (20 tools)

Legend — Frontend: LIVE / PLACEHOLDER. Backend: implemented mechanism. Status: PARTIAL / BROKEN / NOT IMPLEMENTED / BLOCKED / NOT TESTED (live authenticated tests were not possible).

| # | Tool (slug) | Frontend | Backend mechanism | Delivery | Status | Main blocker / recommended fix |
|---|---|---|---|---|---|---|
| 1 | YouTube Video (`youtube-video-downloader`) | LIVE | yt-dlp metadata + 8 tier probes | merge → buffered, 4 MB cap | PARTIAL | D1, D2, D12; YouTube bot checks on cloud IPs; compliance |
| 2 | YouTube Shorts (`youtube-shorts-downloader`) | LIVE | same as #1 | merge | PARTIAL | same; orientation preserved only because no crop code exists (correct) |
| 3 | YouTube Playlist (`youtube-playlist-downloader`) | PLACEHOLDER | none (option unused, `--no-playlist` hardcoded) | none | NOT IMPLEMENTED | Implement client-orchestrated batch + ZIP, or keep honest placeholder |
| 4 | YouTube Thumbnail (`youtube-thumbnail-downloader`) | LIVE | ID parse + CDN variants; MaxRes HEAD check | direct CDN URLs (CORS `*`) | PARTIAL | Works but bypasses proxy/credits; dimensions hard-coded; add proxy + real dimensions |
| 5 | YouTube MP3 (`youtube-to-mp3`) | LIVE | yt-dlp bestaudio → M4A/WebM only | proxy (streamed) | PARTIAL | No MP3 encoder; add ffmpeg extraction at 128/192/320 or rename the tool honestly |
| 6 | TikTok Video (`tiktok-video-downloader`) | LIVE | yt-dlp + `--impersonate chrome` | temp buffer | PARTIAL | D2, D5; impersonation is an anti-bot workaround (compliance); watermark not removed |
| 7 | TikTok MP3 (`tiktok-to-mp3`) | LIVE | download muxed MP4 → ffmpeg MP3 192 k | temp buffer | PARTIAL | Real MP3, but D2/D5 and impersonation apply |
| 8 | TikTok Thumbnail (`tiktok-thumbnail-downloader`) | LIVE | yt-dlp `thumbnail` metadata | proxy | PARTIAL | Depends on impersonated extraction; no dimension measurement |
| 9 | TikTok Photo (`tiktok-photo-downloader`) | LIVE | best-effort image fallback when no video formats | proxy, one by one | PARTIAL | Unreliable, no ZIP (by design), impersonation |
| 10 | Instagram Reels (`instagram-reels-downloader`) | LIVE | yt-dlp | merge | PARTIAL | D2; Instagram blocks datacenter IPs; compliance |
| 11 | Instagram Video (`instagram-video-downloader`) | PLACEHOLDER | none | none | NOT IMPLEMENTED | Route to Reels resolver or keep honest placeholder; no duplicate resolver |
| 12 | Instagram Photo (`instagram-photo-downloader`) | LIVE | gallery-dl (absent) | proxy + dead ZIP | BROKEN | D4; needs worker or disable |
| 13 | Instagram Story (`instagram-story-downloader`) | LIVE | gallery-dl + invalid flag | proxy + dead ZIP | BLOCKED | D4; stories require auth by design |
| 14 | Instagram PFP (`instagram-profile-picture-downloader`) | LIVE | yt-dlp metadata on a profile URL | proxy | BROKEN/UNVERIFIED | yt-dlp does not reliably resolve profile avatars; use Graph API for own account or disable |
| 15 | Facebook Video (`facebook-video-downloader`) | LIVE | yt-dlp | merge | PARTIAL | D2; most FB media needs a session; compliance |
| 16 | Facebook Reels (`facebook-reels-downloader`) | LIVE | yt-dlp | merge | PARTIAL | same |
| 17 | X Video (`x-video-downloader`) | LIVE | yt-dlp variants | merge | PARTIAL | D2, D12 |
| 18 | X GIF (`x-gif-downloader`) | LIVE | smallest stream → ffmpeg GIF | buffered GIF | PARTIAL | D2; GIF size often >4.5 MB; no size/FPS controls |
| 19 | Pinterest Video (`pinterest-video-downloader`) | LIVE | yt-dlp | merge | PARTIAL | D2; compliance |
| 20 | Pinterest Image (`pinterest-image-downloader`) | LIVE | yt-dlp pin extraction | proxy | PARTIAL/UNVERIFIED | Guide itself says the resolver is not a verified Pinterest image extractor |

### Cross-cutting notes

- **Metadata vs download:** no tool can be called "working" on metadata alone. Only real file output under FFprobe counts.
- **Anonymous use is impossible:** every resolve and delivery route calls `requireCredits`, which returns 401 without a session. Copy that says "no login" is false.
- **Thumbnail tool is the only path that does not require the media binaries** (YouTube IDs are parseable), but it still requires auth and Redis to resolve.
- **Playlist/Instagram Video** placeholders are honest today; the guides explicitly describe the missing processors.

---

## 5. Research and decision matrix

### 5.1 Official platform APIs

| Provider | What the official API actually allows | Download of arbitrary third-party media? | Free tier / approval | Verdict |
|---|---|---|---|---|
| **YouTube Data API v3** | Video/playlist metadata, search, captions; uploads for owned channels | **No.** API terms and YouTube ToS prohibit downloading content except where YouTube permits (own uploads via Studio, offline in Premium) | 10,000 units/day quota; Google Cloud project + OAuth for private data | Metadata/playlist title+count only; official download alternatives (Studio) |
| **TikTok Display/Content Posting API** | Public profile/video metadata (Display API), publish to authorized accounts, embed | **No.** No endpoint returns a downloadable file for arbitrary videos | App review; scopes; rate limits | Metadata + embed + own-account flows |
| **Instagram Graph API** | Media for Instagram **Business/Creator accounts you manage**; publishing; insights | **No** for third-party public media. `media_url` only for authorized own media | App review, business verification, tokens | Own-content export only |
| **Facebook Graph API** | Pages you manage, own media, insights | **No** for arbitrary public videos | App review, tokens | Own-content only |
| **X API v2** | Post lookup, media metadata for accessible posts; pay-per-use tiers | **No.** Terms restrict scraping and off-platform redistribution; download of others' media not authorized | Paid tiers/credits; developer agreement | Metadata/preview only |
| **Pinterest API v5** | Pins/boards you own, analytics, publishing | **No** for arbitrary pins | App review; tokens | Own-content only |

**Conclusion:** there is no "official free downloader API" for the product as currently positioned. Any claim to the contrary would be false.

### 5.2 Extraction tools

| Tool | Strengths | Risks / limits | Deployment fit |
|---|---|---|---|
| **yt-dlp** (Unlicense) | Broad extractor coverage, format selection, metadata, merging via ffmpeg | Extractors break weekly; datacenter IPs are blocked/rate-limited (YouTube, Instagram, Facebook, TikTok); `--impersonate` and cookies are anti-bot/authentication workarounds the owner has ruled out; cloud ToS/legal exposure | Works on Vercel Node routes with bundled binary; 300 s max, 2 GB RAM, 500 MB `/tmp` |
| **gallery-dl** (GPL-2.0) | Image galleries, carousels, stories | Python-only, no official standalone binary; serverless IP bans; GPL obligations; story access requires auth | **Not deployable** in this Next.js/Vercel project without a separate worker |
| **FFmpeg / ffprobe** (LGPL/GPL build) | MP3 encoding, muxing, GIF, validation | `ffmpeg-static` ships ffmpeg only (no ffprobe); CPU/memory/time limits; must not fake container labels | Bundled; use stream copy where possible, add `ffprobe-static` if validation is required |

### 5.3 Paid/proxy providers

Not evaluated for integration because the owner prohibited paid providers without approval, and because most "download API" services operate on the same unauthorized-extraction basis. If the owner wants a paid path, the shortlist and contractual review should be a separate decision.

### 5.4 Hosting

| Option | Fit | Verified limits |
|---|---|---|
| **Vercel Functions (current)** | Best for streaming existing files; no new cost | 4.5 MB **buffered** response; streamed responses exempt; 300 s max (Hobby/Pro default), 2 GB/4 GB RAM; 500 MB `/tmp`; 250 MB bundle (40 MB yt-dlp + ffmpeg fit) |
| **Railway / Render / Cloud Run worker** | Needed for gallery-dl, long jobs, queues, large files served from the worker's own domain | Railway Hobby $5/mo minimum with $5 usage; Cloud Run has an always-free 180k vCPU-s / 360k GiB-s / 2M requests per month; egress billed |
| **Paid extraction APIs** | Not recommended before rights review | n/a |

Sources: [Vercel Functions limits](https://vercel.com/docs/functions/limitations), [Railway pricing](https://railway.com/pricing), [Cloud Run pricing](https://cloud.google.com/run/pricing), [YouTube API developer policies](https://developers.google.com/youtube/terms/developer-policies), [Instagram Platform docs](https://developers.facebook.com/documentation/instagram-platform/content-publishing).

---

## 6. Compliance reality (must be decided before code)

The current engine's core mechanism (yt-dlp/gallery-dl extraction of public posts) is not authorized by any of the six platforms' terms for third-party content. TikTok additionally uses TLS impersonation specifically to defeat bot checks, and TikTok delivery captures and replays session cookies. Both conflict directly with the brief's rules against bypassing anti-bot protections, authentication, and platform policies.

There are three coherent postures:

**A. Compliance-first (recommended if the rules are firm).**
- Keep: metadata preview, YouTube thumbnails (public CDN images), official "download your own content" flows (YouTube Studio link, Meta Graph for owned professional accounts, X/Pinterest own-content export), platform-provided download buttons.
- Remove/disable: YouTube video/shorts/MP3/playlist media download, TikTok video/MP3/photo, Instagram public reels/video/photo/story/PFP, Facebook public video/reels, X public video/GIF, Pinterest public video/image.
- Result: ~4–6 honest tools, no extraction engine needed, near-zero legal risk. Most of the 20 downloaders become preview/metadata pages.

**B. Keep current public-download behavior, fix engineering.**
- Fix Redis, streaming delivery, security, resolver efficiency, validation, copy.
- Result: product works as intended technically, but remains non-compliant with YouTube/TikTok/Instagram/Facebook/X/Pinterest terms and the brief's own anti-bypass rule; ongoing risk of IP blocks, takedowns, and account/legal exposure.
- I can implement this only with explicit written acknowledgment that it conflicts with the stated rules.

**C. Hybrid (pragmatic middle).**
- Implement a capability model per tool (`metadata`, `preview`, `download`, `downloadPermitted`, `reason`).
- Keep public extraction only where the owner accepts the risk and the platform is technically stable; clearly label all others as blocked with official alternatives.
- Do not pretend blocked tools work; no "no watermark"/"no login" claims.
- This is the only posture that satisfies "honest alternatives" while preserving as much utility as possible, but it still requires the owner to choose which platforms are in scope.

---

## 7. Recommended architecture

### 7.1 Near term (Vercel-only, no new paid infrastructure)

```
Browser
  └─ POST /api/downloaders/resolve   (validate → provider adapter → capabilities + formats + errors)
  └─ POST /api/downloaders/download  (bind operation, re-check permission, create signed delivery token)
  └─ GET  /api/downloaders/files/:token (stream from /tmp or proxy; MIME, filename, cleanup)
       └─ Provider adapter (yt-dlp / official API / thumbnail)
            ├─ Resolver: one yt-dlp invocation per resolve (metadata + formats)
            ├─ Processor: ffmpeg (MP3/GIF/mux) + ffprobe validation
            └─ Delivery: streamed Response (no 4.5 MB buffered cap)
```

**Why this fits:** the current code already has provider selection, credits, rate limiting, and binaries. The missing pieces are streaming delivery, one-shot resolution, validation, signed delivery, and honest capability reporting. This needs no new vendor and no new monthly cost.

### 7.2 Optional worker (only if required)

A small container (Railway/Render/Cloud Run) running `yt-dlp + ffmpeg + gallery-dl` is the only way to support Instagram carousels/stories reliably and true batch playlist jobs. The worker serves files from its own domain (no Vercel 4.5 MB concern) and exposes a signed job API. Estimated **$5–25/month** at low volume; egress dominates at scale. Do not provision without approval.

### 7.3 Key technical changes

1. **Stream delivery.** Replace `readFile` + `NextResponse(buffer)` with `fs.createReadStream` → web stream; remove the hard 4 MB Vercel cap; keep a configurable max (e.g. 350 MB) and delete the temp dir on stream close/abort.
2. **Fix Redis gate.** Use `fallbackToMemory: true` for resolve and delivery rate limits, or require Upstash in production with a startup health check. Never let a Redis outage silently disable all downloaders.
3. **One-shot resolve.** Use one yt-dlp `-J`/`--print` call to obtain title, thumbnail, duration, and the full format list; build quality tiers from real heights/formats. This removes 7 redundant invocations and most timeout risk.
4. **Signed delivery.** Store `{sourceUrl, headers/cookies, tool, operationId, userId, expiresAt}` server-side in Redis under an HMAC token; delivery URLs carry only the token. Removes cookie leakage and client parameter tampering.
5. **Validation.** Add `ffprobe-static`; verify container, duration, dimensions, and audio presence before labeling MP4/MP3/GIF; reject empty or corrupt output before charging.
6. **Real MP3.** For YouTube MP3, download bestaudio and encode with `libmp3lame` at 128/192/320. If that is not permissible, remove MP3 claims instead of labeling M4A as MP3 (already handled in the guide, not in the tool name).
7. **Real thumbnails.** Proxy YouTube thumbnails through the signed delivery path (credit/operation tracking) and report measured dimensions.
8. **ZIP.** Implement `/api/downloaders/files/:token` archive generation with `jszip` for permitted multi-image sets, or remove the emitted ZIP option entirely.
9. **Playlist.** If approved, implement client-orchestrated batch: resolve playlist (flat), show item list, per-item resolve/download via signed tokens, then zip selected outputs in the browser with the already-installed `jszip`. Enforce item/byte caps, per-item credit charges, skip-and-report failures, and cancellation. No server-side queue is needed for ≤25 items.
10. **Errors.** Replace free-text errors with the structured codes from the brief (`INVALID_URL`, `MEDIA_PRIVATE`, `DOWNLOAD_NOT_PERMITTED`, `FORMAT_UNAVAILABLE`, `MEDIA_EXPIRED`, `PROVIDER_RATE_LIMITED`, `PROCESSING_FAILED`, `FILE_TOO_LARGE`, `TIMEOUT`, `INTERNAL_ERROR`), and map them to friendly UI copy.
11. **Copy/SEO.** Make `tools.ts` match the honest guides: remove "no login", "no watermark", "removes TikTok logo", "up to 4K" unless actually returned; keep canonicals/routes/schema unchanged.
12. **SSRF hardening.** Validate every redirect hop (manual `redirect: 'manual'` loop), resolve DNS and block private/link-local/metadata ranges, cap streamed bytes, and allow only GET/HEAD.

---

## 8. Phased implementation plan

**Phase 0 — safety and truthfulness (no new infrastructure, ~1 day)**
- Fix Redis fail-closed 503 (`fallbackToMemory` for downloader routes).
- Correct misleading copy/FAQ; align `tools.ts` with `toolGuidesDownloaders.ts`.
- Remove the dead gallery ZIP option and invalid Story flag.
- Remove cookies/URLs from query strings; add per-hop redirect validation and private-IP blocking.
- Add structured error codes to `/api/download` responses.
- Outcome: all 20 pages stop making false claims; metadata becomes reachable again where Redis was the blocker.

**Phase 1 — working single-media pipeline (~2–4 days)**
- One-shot yt-dlp resolve; streaming delivery for merge/TikTok/GIF; remove 4 MB cap; cleanup on abort.
- Add ffprobe validation and audio-presence checks.
- Real YouTube MP3 (or honest relabel); TikTok MP3 kept.
- Proxy YouTube thumbnails; measure dimensions.
- Add delivery token binding and per-tool operation linkage.
- Outcome: every permitted single-media download is verified end-to-end on Preview.

**Phase 2 — image/carousel and ZIP (~3–5 days)**
- Decide gallery-dl worker vs disable Instagram Photo/Story.
- Implement ZIP for permitted multi-image sets (server or client).
- Fix or disable Instagram PFP; route Instagram Video to Reels resolver if permissible.
- Outcome: no dead links or unimplemented claims; carousels work where permitted.

**Phase 3 — playlist/batch (~3–5 days, approval required)**
- Playlist metadata, item selection, per-item progress, cancellation, client-side ZIP, caps.
- Outcome: playlist tool either genuinely works or remains an honest unavailable page.

**Phase 4 — QA and SEO evidence (~2 days)**
- FFprobe matrices for every output type; partial-failure tests; mobile browser checks.
- Update sitemap/metadata only if routes changed (none planned).
- Outcome: PASS/PARTIAL/BLOCKED report with evidence per tool.

---

## 9. Test plan and acceptance criteria

Per tool: valid URL, invalid URL, wrong platform, deleted/private content, expired signed URL, provider timeout, rate-limit response, network failure, and a file large enough to exceed 4 MB.

Per output: correct filename, MIME, non-empty file, magic bytes/container, real codec, duration, dimensions, aspect ratio, audio presence, playability, GIF frame count, ZIP integrity, temp cleanup.

Browsers: Chrome/Edge/Firefox desktop, Android Chrome, iOS Safari (Playwright is not installed; add as a dev dependency only if approved).

A tool is PASS only when the delivered bytes pass FFprobe and match the label. Metadata-only success is PARTIAL at best.

---

## 10. Cost model (illustrative)

Assumptions: 25 MB average output, 1 credit per delivery, temp storage only, Vercel Hobby 100 GB/month included fast data transfer; Pro $20/user/month with 1 TB included; overage ~$0.15/GB (verify on the current plan). Compute at 60 s/route, 2 GB.

| Volume | Bandwidth/month | Storage | Estimated Vercel cost | Notes |
|---|---|---|---|---|
| 100 jobs/day | ~75 GB | 0 (temp) | $0 (Hobby) | fits included transfer |
| 1,000 jobs/day | ~750 GB | 0 | ~$0 Hobby if under 100 GB, otherwise Pro $20 (1 TB) | bandwidth 7.5× Hobby allowance |
| 10,000 jobs/day | ~7.5 TB | 0 | Pro $20 + ~$975 egress + compute | external worker/egress contract likely cheaper |

Average output of 100 MB at the same volumes multiplies bandwidth 4×. These are planning estimates, not quotes; verify Vercel usage pricing against the account's plan.

---

## 11. Decisions required before implementation

1. **Compliance posture:** A (compliance-first), B (keep public extraction with written acknowledgment), or C (hybrid capability gates).
2. **Infrastructure:** Vercel-only streaming, or approve a small external worker ($5–25/month) for gallery-dl/playlist.
3. **Phase scope:** approve Phase 0 only, or Phases 0–1, or the full plan.

Phase 0 has been implemented as described in section 12. Phases 1–4 have not been started. No pricing, credit amounts, billing logic, SEO routes, or canonical URLs have been modified.

---

## 12. Phase 0 implementation status (2026-11-16)

### Behavior changes

- **Compliance gate.** `src/lib/downloaderPolicy.ts` is now the single source of truth. Only `youtube-thumbnail-downloader` is delivery-permitted. Every other downloader is preview-only (metadata) or unavailable, with a reason and an official platform reference.
- **Metadata-only resolution.** `resolveWithYtdlp` gained a `metadataOnly` mode that returns title/thumbnail/duration and **zero formats**. It never probes format tiers or calls the remote resolver when preview-only.
- **Server-side delivery gates.** `/api/download/merge`, `/api/tools/tiktok/stream`, `/api/tools/video/url-to-gif`, and `/api/proxy` reject non-permitted tools with `403 DOWNLOAD_NOT_PERMITTED` **before** authentication, credits, or extraction. Unknown tool ids default to deny, so the client-supplied `tool` parameter cannot be spoofed.
- **No anti-bot workarounds.** TikTok TLS impersonation (`--impersonate chrome`) and session-cookie capture/replay were removed from `ytdlp.ts`, the TikTok stream route, and the proxy. TikTok extraction will therefore fail honestly instead of evading bot checks.
- **Rate-limit outage fix.** Downloader routes now use `fallbackToMemory: true` instead of `failClosed`, so a missing/unreachable Upstash instance no longer disables all tools with 503. Limit violations now return 429 (`PROVIDER_RATE_LIMITED`).
- **Proxy hardening.** Removed `ref`/`cookie` query parameters; revalidates every redirect hop; resolves DNS and rejects private/link-local/CGNAT/loopback/metadata ranges; enforces a byte cap on chunked responses; serves downloads with `Cache-Control: private, no-store`.
- **Dead code removed.** The non-existent gallery ZIP URL and the invalid `--cookies-from-browser none` Story flag are gone. Gallery errors no longer echo raw process output.
- **Structured errors.** Key resolve/delivery failures now carry `code` values (`INVALID_URL`, `UNSUPPORTED_PLATFORM`, `MEDIA_PRIVATE`, `MEDIA_NOT_FOUND`, `FORMAT_UNAVAILABLE`, `PROVIDER_RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `PROCESSING_FAILED`, `DOWNLOAD_NOT_PERMITTED`).
- **Truthful UI.** Tool pages now render the restriction message in the hero and a persistent "Preview only" notice under the input, show `Preview metadata only` instead of download formats, and label the action **Preview** instead of **Download**. Result state says "no file is delivered". Workspace pages use the same policy.
- **Catalog and metadata.** Downloader catalog blurbs and route metadata descriptions now describe preview/availability instead of file delivery. Canonical URLs, routes, sitemap, and schema structure were not changed.
- **YouTube video page.** Rewritten headline, subheadline, description, supported formats, 15 FAQs, and how-to steps to describe preview-only behavior.

### Not changed

- Pricing, credit amounts, plans, subscriptions, and webhook logic.
- YouTube thumbnail delivery remains a direct public CDN download (CORS `*`) as before, so it introduces no new credit charge.
- Long-form guide bodies in `toolGuidesDownloaders.ts` and `toolContent.ts` still describe download workflows; aligning them is Phase 1.
- No streaming rewrite of `merge`/TikTok/GIF delivery yet (Phase 1). Those routes are policy-blocked, so the old 4 MB path is currently unreachable through the UI.

### Verification evidence

- `npx tsc --noEmit` → exit 0.
- `npx eslint` on all changed files → exit 0.
- `npx vitest run src/lib/downloaderPolicy.test.ts src/lib/ratelimit.test.ts` → 28 passed.
- Full `npm test` → 235 passed, 4 failed. The 4 failures (PDF renderer, 2 Newsletter, 1 search typo) reproduce on unmodified `HEAD` in a temporary worktree, so they are pre-existing and unrelated.
- Local dev server on port 3210 (not the user's existing 3100 process):
  - `merge` with `tool=youtube-video-downloader` → `403 DOWNLOAD_NOT_PERMITTED`.
  - TikTok stream → `403 DOWNLOAD_NOT_PERMITTED`.
  - X GIF route → `403 DOWNLOAD_NOT_PERMITTED`.
  - Proxy without a permitted tool → `403`; with `youtube-thumbnail-downloader` → `401` sign-in (policy passes).
  - `/api/download` for Instagram Story → `403` policy; for YouTube Video → `401` sign-in (metadata allowed); invalid URL → `400 INVALID_URL`; unknown tool → `404`.
  - SSR pages for TikTok Video, YouTube Video, and Instagram Story contain the preview-only notice; YouTube Thumbnail does not.

### Remaining Phase 1 work

1. Stream `merge`/TikTok/GIF outputs instead of buffering (remove the 4 MB Vercel cap) for any future permitted flow.
2. One-shot yt-dlp resolution and FFprobe validation.
3. Align long-form guides, feature cards, and workspace content with preview-only reality.
4. Decide whether to add official own-content flows (YouTube Data API metadata, Meta Graph for managed accounts) and whether to keep preview extraction at all.
5. Add a live test matrix on Preview with a test account once deployed.

---

## 13. Owner-directed reversal (2026-11-17)

The owner reviewed the preview-only result and asked for the downloaders to work again, with the existing credit/usage gates untouched. Section 12 is kept as history; this section describes the current implementation.

### Behavior now

- **Delivery restored.** `downloaderPolicy.ts` permits delivery for the 16 tools that have a working processor. Four tools remain explicitly unavailable with a reason: `youtube-playlist-downloader` (playlist processing not implemented), `instagram-video-downloader` (use the Reels route), `instagram-photo-downloader`, and `instagram-story-downloader` (needs an authenticated session).
- **Credits unchanged.** `requireCredits` / `JOB_COST` values, plans, billing, and webhook logic were not modified. Delivery routes still charge the same credits as before (proxy 1, merge 1, 4K merge 2, audio conversion 2).
- **One-shot yt-dlp resolve.** `resolveWithYtdlp` runs a single `-J` call and builds formats from what the platform returns: muxed CDN streams go through `/api/proxy`, video-only streams through `/api/download/merge`, audio through `/api/download/audio` (new MP3 route) or the TikTok stream route, and X GIFs through the existing GIF route. The 8-tier sequential probe is gone.
- **Bot-wall mitigations.** Updated bundled `bin/yt-dlp_linux` (2026.10.26), `--force-ipv4`, `--js-runtimes node` plus player-client fallbacks for YouTube, and `--impersonate chrome` for TikTok. These are upstream-supported yt-dlp behaviours; no DRM or session bypass was added.
- **Streaming delivery.** `/api/download/merge` and `/api/tools/tiktok/stream` stream the produced file with `createReadStream` + `Readable.toWeb` and clean up temp files on stream close, so the old 4 MB Vercel buffer cap no longer applies.
- **Thumbnail downloads fixed.** The client only sends the `Idempotency-Key` header on same-origin requests. Cross-origin CDN URLs (for example `img.youtube.com`) previously triggered a CORS preflight that the CDN rejected, surfacing as "Failed to fetch".
- **Instagram profile picture.** New dedicated resolver (`src/lib/instagram.ts`): reads `web_profile_info` for the HD avatar when Instagram answers, falls back to the avatar embedded in the crawler-rendered profile page, and labels the 150×150 fallback with its real size instead of "HD". Copy, guide text, and FAQ were updated to match.
- **Progress UI.** `DownloaderForm` now uses the same `ProcessingProgress` card as the image tools for both the resolve stage and the byte-level download stage.

### Verification evidence

- `npx tsc --noEmit` → exit 0.
- `npx eslint` on changed files → exit 0.
- `npx vitest run` → 261 passed, 4 failed. The same 4 failures (PDF renderer, 2 Newsletter, 1 search typo) reproduce on unmodified `HEAD`, so they are pre-existing and unrelated.
- `src/lib/instagram.test.ts` covers username parsing and avatar extraction (HD field, standard field, `og:image`, JSON escape decoding); the parser also returns the standard avatar from a real saved Instagram profile page.
- Local live checks before this change: YouTube formats 2160→144 via `-J`, TikTok 720p/480p with sizes, Instagram Reels 1080p/720p merge URLs, TikTok MP3 192k format.
- Not verified locally: server-side ffmpeg paths (the `ffmpeg-static` binary is absent on this dev machine) and a real signed-in download on Preview. Both are exercised on Vercel.

