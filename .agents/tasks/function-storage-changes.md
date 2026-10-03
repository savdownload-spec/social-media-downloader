# Function Storage Reduction — Change Log

## Date
2025-07-16

## Root Cause
`outputFileTracingIncludes` in `next.config.js` used the wildcard pattern `/api/**/*`, which
forced ffmpeg-static (~90 MB Linux binary) and bin/yt-dlp_linux (38 MB) into every one of
78 API routes' serverless function bundles, regardless of whether those routes used those binaries.

**Storage math (pre-fix):**
| Binary | Size | Routes | Subtotal |
|---|---|---|---|
| ffmpeg-static (Linux build) | ~90 MB | 78 / 78 | ~7.0 GB |
| bin/yt-dlp_linux | 38 MB | 78 / 78 | ~2.96 GB |
| **Total** | | | **~9.96 GB** |

## Changes Made

### File: `next.config.js`

#### Change 1 — Scope `outputFileTracingIncludes` to the 5 routes that actually need binaries

**Before:**
```js
outputFileTracingIncludes: {
  '/api/**/*': ['./bin/**/*', './node_modules/ffmpeg-static/**/*'],
},
```

**After:**
```js
outputFileTracingIncludes: {
  '/api/download': [
    './bin/**/*',                         // yt-dlp binary
  ],
  '/api/download/merge': [
    './bin/**/*',                         // yt-dlp binary
    './node_modules/ffmpeg-static/**/*',  // ffmpeg binary
  ],
  '/api/tools/tiktok/stream': [
    './bin/**/*',                         // yt-dlp binary
    './node_modules/ffmpeg-static/**/*',  // ffmpeg binary
  ],
  '/api/tools/video': [
    './node_modules/ffmpeg-static/**/*',  // ffmpeg binary (no yt-dlp needed)
  ],
  '/api/tools/video/url-to-gif': [
    './node_modules/ffmpeg-static/**/*',  // ffmpeg binary (no yt-dlp needed)
  ],
},
```

**Why these 5 routes:**
| Route | Needs yt-dlp | Needs ffmpeg | Evidence |
|---|---|---|---|
| `/api/download` | ✅ | ❌ | imports `@/lib/ytdlp` + `@/lib/gallerydl` → `binaryPaths.getYtdlpBin()` |
| `/api/download/merge` | ✅ | ✅ | imports `getYtdlpBin, getFfmpegBin` from `@/lib/binaryPaths` |
| `/api/tools/tiktok/stream` | ✅ | ✅ | imports `getYtdlpBin, getFfmpegBin` from `@/lib/binaryPaths` |
| `/api/tools/video` | ❌ | ✅ | imports `processVideo` from `@/lib/videoService` → `getFfmpegBin()` |
| `/api/tools/video/url-to-gif` | ❌ | ✅ | imports `urlToGif` from `@/lib/videoService` → `getFfmpegBin()` |

All other 73 API routes need neither binary.

#### Change 2 — Add `ffmpeg-static` to `serverComponentsExternalPackages`

**Before:**
```js
serverComponentsExternalPackages: ['pdfkit'],
```

**After:**
```js
serverComponentsExternalPackages: ['pdfkit', 'ffmpeg-static'],
```

**Why:** `ffmpeg-static`'s `index.js` uses a dynamic CommonJS `require()` with platform/arch
detection. Running it un-bundled (like pdfkit) prevents webpack from breaking the binary path
resolution and is belt-and-suspenders insurance alongside the scoped tracing includes.

## Build Verification

Build: ✅ `npm run build` completed with exit code 0

### .nft.json Binary Presence Check (post-build)

**Non-media routes — expect ffmpeg=0, ytdlp=0:**
| Route | ffmpeg | ytdlp | Status |
|---|---|---|---|
| account | 0 | 0 | ✅ OK |
| auth/register | 0 | 0 | ✅ OK |
| admin | 0 | 0 | ✅ OK |
| billing/portal | 0 | 0 | ✅ OK |
| reviews | 0 | 0 | ✅ OK |
| checkout | 0 | 0 | ✅ OK |

**Media routes — expect binaries present:**
| Route | ffmpeg | ytdlp | Status |
|---|---|---|---|
| download | 2 | 2 | ✅ OK |
| download/merge | 12 | 2 | ✅ OK |
| tools/tiktok/stream | 12 | 2 | ✅ OK |
| tools/video | 12 | 1 | ✅ OK |
| tools/video/url-to-gif | 12 | 1 | ✅ OK |

## Test Results

`npm test` — 1 pre-existing failure (unrelated to this change):
- `pdfService.test.ts > renders a PDF page to JPG using the installed renderer` — fails because
  the local dev machine does not have Poppler/Ghostscript installed. This failure was present
  before these changes (confirmed via `git stash` + retest).

## Expected Storage Impact

| Metric | Before | After |
|---|---|---|
| Routes bundling ffmpeg | 78 / 78 | 3 / 78 |
| Routes bundling yt-dlp | 78 / 78 | 3 / 78 |
| Binary storage (ffmpeg ~90 MB × routes) | ~7.0 GB | ~270 MB |
| Binary storage (yt-dlp 38 MB × routes) | ~2.96 GB | ~114 MB |
| **Total Function Storage** | **~9.96 GB** | **~384 MB** |

> Actual savings on Vercel depend on the Linux ffmpeg binary size at build time.
> Old retained deployments also count until deleted (see plan Item 4).

## What Was NOT Changed

- No tool functionality removed or modified
- No dependencies removed or downgraded  
- No dynamic imports added
- No route logic changed
- Sharp, pdf-lib, pdfkit, heic-decode, exceljs — confirmed correctly isolated (no changes needed)
- All 59 tools remain intact
