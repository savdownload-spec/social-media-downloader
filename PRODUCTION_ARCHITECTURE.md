# SavDown Production Architecture & Tool Inventory

## Runtime Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Vercel (Next.js)                                       │
│  • Public website, Workspace UI                        │
│  • Auth (NextAuth), sessions                           │
│  • Credits, billing, payments                          │
│  • PDF tools (pdf-lib, Sharp — no native binaries)     │
│  • Image tools (Sharp)                                 │
│  • Video tools (ffmpeg-static bundled)                 │
│  • Downloaders (yt-dlp binary bundled in bin/)         │
│  • QR, SEO, Utility tools                             │
│  • AI Image Generator (→ Cloudflare Workers AI)       │
│  • Database (Prisma/PostgreSQL via Neon)               │
│  • Redis (Upstash) — rate limiting, caching            │
│  • Blob storage (Vercel Blob) — PDF upload staging     │
└──────────────────────┬──────────────────────────────────┘
                       │ WORKER-REQUIRED tools only
┌──────────────────────▼──────────────────────────────────┐
│  Processing VPS (NOT YET DEPLOYED)                     │
│  • LibreOffice (soffice) — PDF↔Word conversion         │
│  • gallery-dl — Instagram/Pinterest photo tools        │
│  • Accessible via DOWNLOADER_API_URL (optional)        │
└─────────────────────────────────────────────────────────┘
```

---

## Complete Tool Inventory

### A. VERCEL-NATIVE — Works directly on Vercel ✅

#### Downloaders (yt-dlp bundled in `bin/yt-dlp_linux`)
| Tool | Slug | Binary | Status |
|------|------|--------|--------|
| YouTube Video Downloader | `youtube-video-downloader` | yt-dlp + ffmpeg-static | ✅ READY |
| YouTube Shorts Downloader | `youtube-shorts-downloader` | yt-dlp + ffmpeg-static | ✅ READY |
| YouTube Playlist Downloader | `youtube-playlist-downloader` | yt-dlp + ffmpeg-static | ✅ READY |
| YouTube Thumbnail Downloader | `youtube-thumbnail-downloader` | none (CDN direct) | ✅ READY |
| YouTube MP3 Downloader | `youtube-to-mp3` | yt-dlp + ffmpeg-static | ✅ READY |
| TikTok Video Downloader | `tiktok-video-downloader` | yt-dlp (curl_cffi impersonation) | ✅ READY |
| TikTok MP3 Downloader | `tiktok-to-mp3` | yt-dlp + ffmpeg-static | ✅ READY |
| TikTok Thumbnail Downloader | `tiktok-thumbnail-downloader` | yt-dlp | ✅ READY |
| Instagram Reels Downloader | `instagram-reels-downloader` | yt-dlp | ✅ READY |
| Instagram Video Downloader | `instagram-video-downloader` | yt-dlp | ✅ READY |
| Facebook Video Downloader | `facebook-video-downloader` | yt-dlp + ffmpeg-static | ✅ READY |
| Facebook Reels Downloader | `facebook-reels-downloader` | yt-dlp | ✅ READY |
| X (Twitter) Video Downloader | `x-video-downloader` | yt-dlp + ffmpeg-static | ✅ READY |
| X (Twitter) GIF Downloader | `x-gif-downloader` | yt-dlp + ffmpeg-static | ✅ READY |
| Pinterest Video Downloader | `pinterest-video-downloader` | yt-dlp | ✅ READY |

#### PDF Tools (pdf-lib + Sharp — pure Node.js)
| Tool | Slug | Status |
|------|------|--------|
| Merge PDF | `merge-pdf` | ✅ READY |
| Split PDF | `split-pdf` | ✅ READY |
| Compress PDF | `compress-pdf` | ✅ READY |
| JPG to PDF | `jpg-to-pdf` | ✅ READY |
| PDF to JPG | `pdf-to-jpg` | ✅ READY (requires Poppler/pdftoppm on server) |

#### Image Tools (Sharp)
| Tool | Slug | Status |
|------|------|--------|
| Image Compressor | `image-compressor` | ✅ READY |
| Image Resizer | `image-resizer` | ✅ READY |
| Image Converter | `image-converter` | ✅ READY |
| Image Enhancer | `image-enhancer` | ✅ READY |
| JPG to PNG | `jpg-to-png` | ✅ READY |
| PNG to JPG | `png-to-jpg` | ✅ READY |
| WEBP Converter | `webp-converter` | ✅ READY |
| HEIC to JPG | `heic-to-jpg` | ✅ READY |

#### Video Tools (ffmpeg-static bundled)
| Tool | Slug | Status |
|------|------|--------|
| Video Converter | `video-converter` | ✅ READY |
| Video Compressor | `video-compressor` | ✅ READY |
| Video to MP3 | `video-to-mp3` | ✅ READY |
| GIF Maker | `gif-maker` | ✅ READY |
| MP4 to GIF | `mp4-to-gif` | ✅ READY |

#### QR Tools (qrcode + jsqr npm packages)
| Tool | Slug | Status |
|------|------|--------|
| QR Code Generator | `qr-code-generator` | ✅ READY |
| QR Code Scanner | `qr-code-scanner` | ✅ READY |

#### Utility Tools (client-side only)
| Tool | Slug | Status |
|------|------|--------|
| Color Picker | `color-picker` | ✅ READY |
| Gradient Generator | `gradient-generator` | ✅ READY |

#### SEO Tools (client-side template generation, no API)
| Tool | Slug | Status |
|------|------|--------|
| Meta Title Generator | `meta-title-generator` | ✅ READY |
| Meta Description Generator | `meta-description-generator` | ✅ READY |
| YouTube Tags Generator | `youtube-tags-generator` | ✅ READY |
| Keyword Generator | `keyword-generator` | ✅ READY |
| Schema Generator | `schema-generator` | ✅ READY |

---

### B. EXTERNAL API REQUIRED

#### AI Tools (Cloudflare Workers AI)
| Tool | Slug | Provider | Status |
|------|------|----------|--------|
| AI Image Generator | `ai-image-generator` | Cloudflare Workers AI | ✅ READY (requires `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`) |

---

### C. WORKER/VPS REQUIRED — needs LibreOffice on a persistent server

| Tool | Slug | Binary | Status |
|------|------|--------|--------|
| PDF to Word | `pdf-to-word` | LibreOffice `soffice` | ⚠️ READY AFTER VPS DEPLOYMENT |
| Word to PDF | `word-to-pdf` | LibreOffice `soffice` | ⚠️ READY AFTER VPS DEPLOYMENT |

**Behavior on Vercel without LibreOffice:** Routes now return HTTP 503 with a clear error message _before_ attempting credit deduction. The UI shows the error. Tools remain visible (not hidden) — they work when `soffice` is available.

---

### D. WORKER/VPS REQUIRED — needs gallery-dl on a persistent server

| Tool | Slug | Binary | Status |
|------|------|--------|--------|
| TikTok Photo Downloader | `tiktok-photo-downloader` | gallery-dl | ⚠️ READY AFTER VPS DEPLOYMENT |
| Instagram Photo Downloader | `instagram-photo-downloader` | gallery-dl | ⚠️ READY AFTER VPS DEPLOYMENT |
| Instagram Story Downloader | `instagram-story-downloader` | gallery-dl | ⚠️ READY AFTER VPS DEPLOYMENT |
| Instagram Profile Picture | `instagram-profile-picture-downloader` | gallery-dl | ⚠️ READY AFTER VPS DEPLOYMENT |
| Pinterest Image Downloader | `pinterest-image-downloader` | gallery-dl | ⚠️ READY AFTER VPS DEPLOYMENT |

**Behavior without gallery-dl:** Routes check `isBinaryAvailable()` before processing and return a clear error. No credits are charged.

---

### E. NOT YET IMPLEMENTED — show "Coming Soon" correctly

These are in `catalog.ts` but NOT in `functionalTools.ts`, so `isToolAvailable()` returns `false` and the tools page correctly shows them as Coming Soon:

| Tool | Slug | Notes |
|------|------|-------|
| Background Remover | `background-remover` | Needs AI provider or rembg |
| Image Upscaler | `image-upscaler` | Needs AI upscaling model |
| AI Thumbnail Generator | `ai-thumbnail-generator` | Needs AI provider |
| AI Background Remover | `ai-background-remover` | Duplicate of Background Remover |
| AI Image Enhancer | `ai-image-enhancer` | Needs AI provider |
| AI YouTube Title Generator | `ai-youtube-title-generator` | Could use local templates |
| AI Description Generator | `ai-description-generator` | Could use local templates |
| AI Hashtag Generator | `ai-hashtag-generator` | Could use local templates |
| AI Caption Generator | `ai-caption-generator` | Could use local templates |

---

## VPS Deployment Plan (for Worker-Required tools)

When deploying the processing VPS:

1. **Install dependencies:**
   ```bash
   apt-get install libreoffice-core libreoffice-writer python3-pip
   pip3 install gallery-dl
   ```

2. **Set environment variables on VPS:**
   - `GALLERY_DL_BIN=/usr/local/bin/gallery-dl`
   - No extra config needed for LibreOffice (auto-detected at `/usr/bin/soffice`)

3. **On Vercel, point to VPS sidecar (optional):**
   - `DOWNLOADER_API_URL=https://your-vps.example.com/info`
   - `DOWNLOADER_API_KEY=<secret>`

4. **Alternatively:** Deploy SavDown itself on the VPS (Docker) for full native binary support. `docker-compose.yml` is already present.

---

## Key Production Environment Variables

### Required for launch
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL pooled (Neon) |
| `DIRECT_URL` | PostgreSQL direct (migrations) |
| `NEXTAUTH_URL` | Full production URL |
| `NEXTAUTH_SECRET` | NextAuth signing secret |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for PDF staging |
| `CRON_SECRET` | Protects `/api/tools/pdf/cleanup` |

### Required for payments
| Variable | Purpose |
|----------|---------|
| `SAFEPAY_SECRET_KEY` | Safepay payments |
| `SAFEPAY_MERCHANT_API_KEY` | Safepay merchant |
| `SAFEPAY_WEBHOOK_SECRET` | Webhook validation |

### Required for Google login
| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |

### Optional but recommended
| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Rate limiting + caching |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting + caching |
| `CLOUDFLARE_ACCOUNT_ID` | AI Image Generator |
| `CLOUDFLARE_API_TOKEN` | AI Image Generator |
| `ADMIN_EMAILS` | Admin access list |

### VPS-only (not needed on Vercel unless using sidecar)
| Variable | Purpose |
|----------|---------|
| `GALLERY_DL_BIN` | Path to gallery-dl binary |
| `DOWNLOADER_API_URL` | Sidecar service URL |
| `DOWNLOADER_API_KEY` | Sidecar auth token |

---

## Pre-Launch Status Summary

| Category | Tools | Ready | Worker Required | Not Implemented |
|----------|-------|-------|-----------------|-----------------|
| Downloaders (yt-dlp) | 15 | 15 | 0 | 0 |
| Downloaders (gallery-dl) | 5 | 0 | 5 | 0 |
| Image Tools | 10 | 8 | 0 | 2 (bg-remover, upscaler) |
| Video Tools | 5 | 5 | 0 | 0 |
| PDF Tools | 7 | 5 | 2 (pdf↔word) | 0 |
| AI Tools | 8 | 1 (ai-image-gen) | 0 | 7 |
| SEO Tools | 5 | 5 | 0 | 0 |
| Utility Tools | 4 | 4 | 0 | 0 |
| **Total** | **59** | **43** | **7** | **9** |

> 43 tools are ready to launch on Vercel without any additional infrastructure.
> 7 more become available when the processing VPS is deployed (LibreOffice + gallery-dl).
> 9 are correctly shown as "Coming Soon" and require future implementation.
