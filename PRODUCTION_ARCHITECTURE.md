# SavDown Production Architecture & Tool Inventory

_Last updated: final free-first pass — 48 → 56 active tools_

## Runtime Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  • Background Remover (ONNX/WASM via @imgly)           │
│  • Image Upscaler (Canvas API 2x/4x)                   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  Vercel (Next.js 14)                                    │
│  • Auth (NextAuth), sessions, credits, billing         │
│  • PDF tools (pdf-lib, Sharp, mammoth+pdfkit)          │
│  • Image tools (Sharp)                                 │
│  • Video tools (ffmpeg-static bundled)                 │
│  • Downloaders (yt-dlp binary bundled in bin/)         │
│  • QR, SEO, Utility tools                             │
│  • AI Image + text tools (→ Cloudflare Workers AI)    │
│  • Database: Neon PostgreSQL via Prisma               │
│  • Cache/RateLimit: Upstash Redis                     │
│  • Blob storage: Vercel Blob (PDF staging)            │
└──────────────────────┬──────────────────────────────────┘
                       │ VPS-required tools only (3 remaining)
┌──────────────────────▼──────────────────────────────────┐
│  Processing VPS (NOT YET DEPLOYED)                     │
│  • LibreOffice (soffice) — PDF→Word conversion         │
│  • gallery-dl — Instagram photo/story tools            │
└─────────────────────────────────────────────────────────┘
```

---

## Can SavDown launch without a VPS? **YES.**

56 of 59 tools are fully active on Vercel + browser. The 3 VPS-required tools show a clear "unavailable" message until a VPS is deployed — no credits are charged.

---

## Complete Tool Inventory (59 tools)

### A. VERCEL-NATIVE — Active without additional infrastructure ✅

#### Downloaders (yt-dlp bundled in `bin/yt-dlp_linux`)
| Tool | Slug | Status |
|------|------|--------|
| YouTube Video Downloader | `youtube-video-downloader` | ✅ ACTIVE |
| YouTube Shorts Downloader | `youtube-shorts-downloader` | ✅ ACTIVE |
| YouTube Playlist Downloader | `youtube-playlist-downloader` | ✅ ACTIVE |
| YouTube Thumbnail Downloader | `youtube-thumbnail-downloader` | ✅ ACTIVE |
| YouTube MP3 Downloader | `youtube-to-mp3` | ✅ ACTIVE |
| TikTok Video Downloader | `tiktok-video-downloader` | ✅ ACTIVE |
| TikTok MP3 Downloader | `tiktok-to-mp3` | ✅ ACTIVE |
| TikTok Thumbnail Downloader | `tiktok-thumbnail-downloader` | ✅ ACTIVE |
| TikTok Photo Downloader | `tiktok-photo-downloader` | ✅ ACTIVE (yt-dlp slideshow) |
| Instagram Reels Downloader | `instagram-reels-downloader` | ✅ ACTIVE |
| Instagram Video Downloader | `instagram-video-downloader` | ✅ ACTIVE |
| Instagram Profile Picture | `instagram-profile-picture-downloader` | ✅ ACTIVE (yt-dlp metadata) |
| Facebook Video Downloader | `facebook-video-downloader` | ✅ ACTIVE |
| Facebook Reels Downloader | `facebook-reels-downloader` | ✅ ACTIVE |
| X (Twitter) Video Downloader | `x-video-downloader` | ✅ ACTIVE |
| X (Twitter) GIF Downloader | `x-gif-downloader` | ✅ ACTIVE |
| Pinterest Video Downloader | `pinterest-video-downloader` | ✅ ACTIVE |
| Pinterest Image Downloader | `pinterest-image-downloader` | ✅ ACTIVE |

#### PDF Tools (pdf-lib + Sharp; Word→PDF via mammoth + pdfkit)
| Tool | Slug | Status |
|------|------|--------|
| Merge PDF | `merge-pdf` | ✅ ACTIVE |
| Split PDF | `split-pdf` | ✅ ACTIVE |
| Compress PDF | `compress-pdf` | ✅ ACTIVE |
| JPG to PDF | `jpg-to-pdf` | ✅ ACTIVE |
| PDF to JPG | `pdf-to-jpg` | ✅ ACTIVE |
| Word to PDF | `word-to-pdf` | ✅ ACTIVE (basic: mammoth+pdfkit on Vercel; full: LibreOffice when available) |

#### Image Tools (Sharp + browser)
| Tool | Slug | Status |
|------|------|--------|
| Image Compressor | `image-compressor` | ✅ ACTIVE |
| Image Resizer | `image-resizer` | ✅ ACTIVE |
| Image Converter | `image-converter` | ✅ ACTIVE |
| Image Enhancer | `image-enhancer` | ✅ ACTIVE |
| JPG to PNG | `jpg-to-png` | ✅ ACTIVE |
| PNG to JPG | `png-to-jpg` | ✅ ACTIVE |
| WEBP Converter | `webp-converter` | ✅ ACTIVE |
| HEIC to JPG | `heic-to-jpg` | ✅ ACTIVE |
| Background Remover | `background-remover` | ✅ ACTIVE (browser ONNX via @imgly) |
| Image Upscaler | `image-upscaler` | ✅ ACTIVE (browser Canvas 2x/4x) |

#### Video Tools (ffmpeg-static)
| Tool | Slug | Status |
|------|------|--------|
| Video Converter | `video-converter` | ✅ ACTIVE |
| Video Compressor | `video-compressor` | ✅ ACTIVE |
| Video to MP3 | `video-to-mp3` | ✅ ACTIVE |
| GIF Maker | `gif-maker` | ✅ ACTIVE |
| MP4 to GIF | `mp4-to-gif` | ✅ ACTIVE |

#### QR Tools
| Tool | Slug | Status |
|------|------|--------|
| QR Code Generator | `qr-code-generator` | ✅ ACTIVE |
| QR Code Scanner | `qr-code-scanner` | ✅ ACTIVE |

#### Utility Tools (client-side)
| Tool | Slug | Status |
|------|------|--------|
| Color Picker | `color-picker` | ✅ ACTIVE |
| Gradient Generator | `gradient-generator` | ✅ ACTIVE |

#### SEO Tools (client-side)
| Tool | Slug | Status |
|------|------|--------|
| Meta Title Generator | `meta-title-generator` | ✅ ACTIVE |
| Meta Description Generator | `meta-description-generator` | ✅ ACTIVE |
| YouTube Tags Generator | `youtube-tags-generator` | ✅ ACTIVE |
| Keyword Generator | `keyword-generator` | ✅ ACTIVE |
| Schema Generator | `schema-generator` | ✅ ACTIVE |

---

### B. CLOUDFLARE WORKERS AI REQUIRED

| Tool | Slug | Model | Status |
|------|------|-------|--------|
| AI Image Generator | `ai-image-generator` | FLUX-2 Klein/Dev | ✅ ACTIVE |
| AI YouTube Title Generator | `ai-youtube-title-generator` | llama-3.1-8b-instruct | ✅ ACTIVE |
| AI Description Generator | `ai-description-generator` | llama-3.1-8b-instruct | ✅ ACTIVE |
| AI Hashtag Generator | `ai-hashtag-generator` | llama-3.1-8b-instruct | ✅ ACTIVE |
| AI Caption Generator | `ai-caption-generator` | llama-3.1-8b-instruct | ✅ ACTIVE |
| AI Thumbnail Generator | `ai-thumbnail-generator` | FLUX-2 (16:9 preset) | ✅ ACTIVE |
| AI Background Remover | `ai-background-remover` | Browser ONNX (@imgly) | ✅ ACTIVE |
| AI Image Enhancer | `ai-image-enhancer` | Sharp (server-side) | ✅ ACTIVE |

**Free quota:** 10,000 neurons/day shared. **SavDown limits:** AI text 10 calls/day/user + 15/min/IP; AI image 5 images/day/user (free plan) + 6/min/IP. Quota-exhausted → HTTP 429, no credit charge.

---

### C. VPS REQUIRED (3 tools)

| Tool | Reason | Status |
|------|--------|--------|
| `pdf-to-word` | LibreOffice only viable DOCX converter | ⚠️ VPS REQUIRED |
| `instagram-photo-downloader` | gallery-dl needed; serverless IPs rate-banned | ⚠️ VPS REQUIRED |
| `instagram-story-downloader` | Stories require auth — no public access | ⚠️ VPS REQUIRED |

---

## Tool Count Summary

| Status | Count |
|--------|-------|
| Active (Vercel-native or browser) | 53 |
| Active (requires CF AI credentials) | 3 |
| Active/Limited (basic quality, full needs VPS) | 1 (`word-to-pdf`) |
| VPS Required | 3 |
| **Total** | **59** |

---

## VPS Decision Detail

### `pdf-to-word` — VPS Required
- pdf2docx (Python-only), pdfjs+docx (text only), free APIs (paid server-side) all rejected
- LibreOffice is the only tool producing acceptable DOCX with tables, images, layouts
- Route returns HTTP 503 before any credit is charged when soffice is absent

### `instagram-photo-downloader` — VPS Required
- yt-dlp works for single posts but is unreliable for carousels; serverless IPs get banned quickly
- gallery-dl with persistent session on a VPS is the only stable solution

### `instagram-story-downloader` — VPS Required
- Fundamental platform restriction: stories are not publicly accessible without authentication
- No serverless or browser solution possible without user OAuth (out of scope)

---

## Infrastructure

| Service | Usage | Free Limit |
|---------|-------|------------|
| Vercel | Next.js hosting, all API routes | 100GB bandwidth, 1M invocations/month |
| Neon (PostgreSQL) | Users, credits, sessions | 0.5GB storage, 190 compute hours/month |
| Vercel Blob | PDF staging (24h TTL via CRON) | 1GB |
| Upstash Redis | Rate limiting, daily AI quotas, cache | 10,000 commands/day |
| Cloudflare Workers AI | AI image + text generation | 10,000 neurons/day |
| @imgly/background-removal | Browser background removal | Unlimited (client-side) |
| Canvas API | Browser image upscaling | Unlimited (client-side) |

---

## Change Log — This Pass (48 → 56 active tools)

| Tool | Previous | New | Method |
|------|----------|-----|--------|
| `word-to-pdf` | VPS Required | ✅ ACTIVE (basic) | mammoth + pdfkit fallback |
| `tiktok-photo-downloader` | VPS Required | ✅ ACTIVE | yt-dlp slideshow extraction |
| `instagram-profile-picture-downloader` | VPS Required | ✅ ACTIVE | yt-dlp metadata endpoint |
| `background-remover` | Coming Soon | ✅ ACTIVE | @imgly/background-removal (browser ONNX) |
| `image-upscaler` | Coming Soon | ✅ ACTIVE | Canvas 2x/4x (browser, no ML) |
| `ai-thumbnail-generator` | Coming Soon | ✅ ACTIVE | Reuses AIImageGenerator (16:9) |
| `ai-background-remover` | Coming Soon | ✅ ACTIVE | Reuses BackgroundRemoverTool |
| `ai-image-enhancer` | Coming Soon | ✅ ACTIVE | Reuses ImageTool (Sharp) |
| Daily AI text quota | Missing | ✅ ADDED | 10 calls/day/user via Redis |

---

## Required Environment Variables

### Launch-critical
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL pooled (Neon) |
| `DIRECT_URL` | PostgreSQL direct (migrations) |
| `NEXTAUTH_URL` | Full production URL |
| `NEXTAUTH_SECRET` | NextAuth signing secret |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob |
| `CRON_SECRET` | PDF cleanup cron |

### Payments (Safepay)
`SAFEPAY_SECRET_KEY`, `SAFEPAY_MERCHANT_API_KEY`, `SAFEPAY_WEBHOOK_SECRET`

### Google OAuth
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Optional
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `ADMIN_EMAILS`

### VPS-only
`GALLERY_DL_BIN`, `DOWNLOADER_API_URL`, `DOWNLOADER_API_KEY`
