# SavDown | One Toolkit For Everything You Share

A production-ready, full-stack social media downloader built with Next.js 14, TypeScript, Tailwind, Framer Motion, Prisma, PostgreSQL, and Redis.

**Design philosophy:** Apple-inspired simplicity, Linear-quality polish, Stripe-level spacing, Notion cleanliness. Light theme only. 24px rounded cards. Soft shadows. Framer Motion micro-interactions.

**Supported platforms:** YouTube (videos, Shorts, thumbnails), TikTok, Instagram Reels, Facebook, Pinterest, X.

---

## Table of contents

1. [Requirements](#requirements)
2. [Quick start](#quick-start)
3. [Environment variables](#environment-variables)
4. [Downloader service integration](#downloader-service-integration)
5. [Folder structure](#folder-structure)
6. [Database](#database)
7. [API endpoints](#api-endpoints)
8. [Rate limiting](#rate-limiting)
9. [Authentication](#authentication)
10. [Admin panel](#admin-panel)
11. [SEO](#seo)
12. [Deployment](#deployment)
13. [Security](#security)

---

## Requirements

- **Node.js** 20+ (LTS recommended)
- **PostgreSQL** 14+ (or use the included docker-compose)
- **Redis** 7+ (or use the included docker-compose, or Upstash for serverless)

---

## Quick start

```bash
# 1) Install dependencies
npm install

# 2) Copy env and adjust values
cp .env.example .env
# Generate a NextAuth secret and paste it into NEXTAUTH_SECRET:
#   openssl rand -base64 32

# 3) Start Postgres + Redis via Docker (optional but easy)
docker compose up -d

# 4) Push the schema to your database and seed
npx prisma db push
npm run db:seed

# 5) Run the dev server
npm run dev
```

Open **http://localhost:3000**.

The app runs fully in **demo mode** out of the box — the UI works, the DB logs, but downloads return placeholder data until you plug in a real downloader service (see next section).

---

## Environment variables

Full list in `.env.example`. The critical ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Session encryption key (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Full public URL of your site |
| `REDIS_URL` or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Cache + rate limiting (either works) |
| `DOWNLOADER_API_URL` | Your media-resolution service — see below |
| `DOWNLOADER_API_KEY` | Bearer token for your downloader service |
| `ADMIN_EMAILS` | Comma-separated list of admin emails |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google sign-in |
| `GITHUB_ID` / `GITHUB_SECRET` | Optional GitHub sign-in |

---

## Downloader service integration

**This project doesn't ship its own media-extraction engine on purpose.** Bundling `yt-dlp` or similar directly into a Next.js repo creates legal, maintenance, and deployment headaches. Instead, `src/app/api/download/route.ts` delegates to a `DOWNLOADER_API_URL` you control.

You have three sensible paths:

### 1. Run your own micro-service

The simplest self-hosted setup is a small Python or Node service that wraps `yt-dlp`:

```bash
# Example: a tiny FastAPI wrapper around yt-dlp
# POST { "url": "...", "tool": "youtube-video-downloader" }
# Returns the JSON shape shown below
```

Point `DOWNLOADER_API_URL` at it (e.g. `http://localhost:8000/resolve`).

### 2. Use a paid API

Services like RapidAPI have YouTube/TikTok/Instagram resolvers. Point `DOWNLOADER_API_URL` at their endpoint and set `DOWNLOADER_API_KEY`.

### 3. Stay in demo mode

Leave `DOWNLOADER_API_URL` empty. The API returns a placeholder result so you can develop and test the UI without a real backend.

### Expected response shape

Your service must return JSON in this shape (matches `src/types/index.ts`):

```json
{
  "ok": true,
  "title": "Video title",
  "thumbnail": "https://…jpg",
  "author": "Creator name",
  "platform": "youtube",
  "formats": [
    { "label": "MP4 1080p", "quality": "1080p", "extension": "mp4", "size": "24.6 MB", "url": "https://…mp4", "hasAudio": true, "hasVideo": true }
  ]
}
```

Or on error:

```json
{ "ok": false, "error": "Human-readable message" }
```

---

## Folder structure

```
social-media-downloader/
├── prisma/
│   ├── schema.prisma          # DB models
│   └── seed.ts                # Seed blog posts
├── public/
│   ├── favicon.svg
│   ├── logo.svg
│   └── og-default.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout + JSON-LD
│   │   ├── page.tsx           # Home
│   │   ├── globals.css
│   │   ├── sitemap.ts         # Dynamic sitemap
│   │   ├── robots.ts          # robots.txt
│   │   ├── not-found.tsx      # 404
│   │   ├── tools/
│   │   │   └── [8 tool pages, each 20 lines pulling from tools registry]
│   │   ├── blog/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── about, contact, privacy, terms, cookies, dmca, faq, search, admin/
│   │   └── api/
│   │       ├── download/route.ts    # Main downloader endpoint
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── analytics/route.ts
│   │       ├── admin/route.ts
│   │       ├── newsletter/route.ts
│   │       └── contact/route.ts
│   ├── components/
│   │   ├── layout/ (Header, Footer, Container)
│   │   ├── home/   (Hero, PlatformCards, PopularTools, TrendingTools, LatestArticles, FAQ, Newsletter)
│   │   ├── tools/  (DownloaderForm, ToolPage)
│   │   └── ui/     (Button, Card, Input, Badge)
│   ├── config/
│   │   ├── site.ts     # Site-wide config
│   │   └── tools.ts    # Single source of truth for all 8 tools
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── redis.ts    # Dual local / Upstash
│   │   ├── ratelimit.ts
│   │   ├── auth.ts     # NextAuth config
│   │   ├── seo.ts      # Metadata + JSON-LD helpers
│   │   └── utils.ts
│   └── types/index.ts
├── docker-compose.yml
├── Dockerfile
├── next.config.js
├── tailwind.config.ts
├── package.json
└── README.md
```

---

## Database

Schema lives in `prisma/schema.prisma`. Models:

- **User, Account, Session, VerificationToken** — NextAuth-compatible auth models
- **Download** — logs every successful download (platform, tool, IP hash, timestamp)
- **AnalyticsEvent** — arbitrary client-side analytics events
- **Post** — blog posts with slug, tags, publish flag
- **NewsletterSubscriber** — email list
- **ContactMessage** — inbound contact form submissions

Common commands:

```bash
npm run db:push       # Push schema to DB (dev)
npm run db:migrate    # Create + apply a migration (prod flow)
npm run db:studio     # Open Prisma Studio
npm run db:seed       # Seed blog posts
```

---

## API endpoints

All endpoints are rate-limited and return JSON.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/download` | Resolve a URL to downloadable formats |
| `GET`/`POST` | `/api/auth/[...nextauth]` | NextAuth handlers |
| `POST` | `/api/analytics` | Log a client-side event |
| `POST` | `/api/newsletter` | Subscribe an email |
| `POST` | `/api/contact` | Submit a contact form |
| `GET` | `/api/admin` | Admin summary stats (auth-gated) |

### `POST /api/download`

**Request:**
```json
{ "url": "https://youtube.com/watch?v=…", "tool": "youtube-video-downloader" }
```

**Response (success):** `DownloadResult` (see [downloader service section](#expected-response-shape)).

**Rate limit:** 20 requests / minute per IP.

---

## Rate limiting

Fixed-window rate limiter using Redis `INCR` + `EXPIRE`. Config in `src/lib/ratelimit.ts`. Defaults:

- `/api/download` — 20/min per IP
- `/api/analytics` — 60/min per IP
- `/api/newsletter` — 5/min per IP
- `/api/contact` — 3/min per IP

If Redis isn't configured, rate limiting **silently no-ops** (dev convenience). Configure Redis in production.

---

## Authentication

NextAuth v4 with JWT sessions. Providers are added conditionally — if `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` aren't set, Google sign-in disappears from the UI. Same for GitHub.

Admin role: any email listed in `ADMIN_EMAILS` (comma-separated) is auto-promoted to `ADMIN` on first sign-in. All other users are `USER`.

Sign-in flow: `/api/auth/signin` (NextAuth default) — customize the sign-in page in `src/lib/auth.ts` by setting `pages.signIn`.

---

## Admin panel

`/admin` — shows total downloads, users, subscribers, top tools, and recent activity. Only visible to users whose email is in `ADMIN_EMAILS`.

---

## SEO

Every SEO essential is wired in:

- **Meta titles & descriptions** — per-page via `buildMetadata()` in `src/lib/seo.ts`
- **Canonical URLs** — automatic
- **Open Graph & Twitter Cards** — auto-generated
- **JSON-LD schema** — Organization, WebSite, SoftwareApplication, BreadcrumbList, FAQPage
- **Sitemap** — `/sitemap.xml` (dynamic, includes blog posts + all tool pages)
- **Robots** — `/robots.txt` (allows all, blocks `/admin` and `/api/`)
- **Semantic HTML** — proper `h1`/`h2` hierarchy, breadcrumbs, alt text
- **Core Web Vitals** — Next.js Image, font optimization, no CLS
- **Internal linking** — tool pages link back to home, related tools, and blog
- **Accessibility** — ARIA labels, keyboard nav, focus rings, color contrast

To customize your OG image, replace `public/og-default.svg` with a 1200×630 PNG for best social-share results.

---

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import into Vercel
3. Add environment variables in Vercel dashboard
4. Add a PostgreSQL database (Vercel Postgres, Neon, Supabase, or Railway)
5. Add Redis (Upstash — set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`)
6. Deploy

Post-deploy, run migrations from your local machine:
```bash
DATABASE_URL="your-prod-db-url" npx prisma db push
```

### Docker

```bash
docker build -t savdown .
docker run -p 3000:3000 --env-file .env savdown
```

### Self-hosted

Any Node.js 20 host works. Behind an Nginx reverse proxy:

```nginx
server {
    server_name savdown.example.com;
    location / { proxy_pass http://localhost:3000; }
}
```

---

## Security

Built-in:

- **HTTPS headers** — HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy (in `next.config.js`)
- **CSRF protection** — NextAuth handles this
- **Input validation** — every API route uses Zod schemas
- **Rate limiting** — every mutating endpoint
- **IP hashing** — we never store raw IPs, only SHA-256 hashes
- **No secret leakage** — `NEXT_PUBLIC_*` prefix is the only way secrets reach the client
- **SQL injection** — Prisma parameterizes everything
- **XSS** — React escapes by default; JSON-LD is the only `dangerouslySetInnerHTML`

To add:

- **CAPTCHA** on `/api/newsletter` and `/api/contact` (Cloudflare Turnstile is a good fit)
- **CSP header** — add a Content-Security-Policy header in `next.config.js` once you know your third-party origins
- **Sentry** — for production error tracking

---

## Legal reminder

You are responsible for how this platform is used. Only download content you own or have explicit rights to. SavDown itself does not host, store, or index copyrighted content — it's a UI over a URL resolver.

Review `/privacy`, `/terms`, `/dmca`, and `/cookies` — they're production-quality drafts, but have a lawyer review them before launch.

---

## License

Add your license here (MIT, Apache-2.0, or proprietary).

---

**Made for people who love clean tools.**
