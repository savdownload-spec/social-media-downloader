# PR Audit Facts — social-media-downloader
Generated: read-only audit, no changes made.

---

## Repository

- Remote: `https://github.com/savdownload-spec/social-media-downloader.git`
- Default branch: `main`
- HEAD on main: `f04afe2` — `fix: reduce Vercel Function Storage footprint - scope binary tracing and externalize heavy deps`

---

## PR #3 — Install Vercel Web Analytics

### Metadata
| Field | Value |
|-------|-------|
| Number | 3 |
| Title | Install Vercel Web Analytics |
| State | open |
| Draft | YES |
| Source branch | `vercel/install-vercel-web-analytics-w9n4ra` |
| Base branch | `main` |
| Merged | NO |
| Additions | 12 |
| Deletions | 0 |
| Changed files | 1 |
| Author | Vercel Agent (bot) |
| Head commit | `dd43e895` — "Install Vercel Web Analytics" |

### Changed Files
Only `package-lock.json` — **NOT** `package.json` or `src/app/layout.tsx`.

### Diff Summary (PR #3 vs main)
`package-lock.json` only — 12 additions, 0 deletions:
1. Added `"dev": true` to `node_modules/fsevents` entry
2. Added new `node_modules/next-intl/node_modules/@swc/helpers` entry (v0.5.23, optional/peer)

No changes to `package.json` (analytics package already present).
No changes to `src/app/layout.tsx` (Analytics component already present).

### Comparison with main
`git diff --stat main...origin/vercel/install-vercel-web-analytics-w9n4ra`
```
package-lock.json | 12 ++++++++++++
1 file changed, 12 insertions(+)
```
**The analytics code (`package.json` dep + layout import + `<Analytics />`) is already in `main`.**
The only delta is a minor lockfile metadata change (`fsevents` dev flag + `@swc/helpers` nested dep entry).

### Check Results
```
[completed/success] Vercel Preview Comments   https://vercel.com/github
[completed/success] Build & Type Check        https://github.com/savdownload-spec/social-media-downloader/actions/runs/36903417678/job/110507891071
```
All checks pass (2/2 ✅).

### Vercel Deployment
- Status: `DEPLOYED`
- Preview URL: `social-media-downloader-git-vercel-install-verc-6529f3-sav-down.vercel.app`
- Inspector: `https://vercel.com/sav-down/social-media-downloader/5TqKpgqLxR3TL8DEkAjKhLw2BxGt`

### PR #3 Body Summary
The Vercel Agent confirmed `@vercel/analytics@1.3.2` was already in `package.json` and `<Analytics />` was already in `src/app/layout.tsx`. The PR only updated `package-lock.json` (ran `npm install`).

---

## PR #4 — Add Vercel Web Analytics integration

### Metadata
| Field | Value |
|-------|-------|
| Number | 4 |
| Title | Add Vercel Web Analytics integration |
| State | open |
| Draft | YES |
| Source branch | `vercel/vercel-web-analytics-integrati-n58pdk` |
| Base branch | `main` |
| Merged | NO |
| Additions | 12 |
| Deletions | 0 |
| Changed files | 1 |
| Author | Vercel Agent (bot) |
| Head commit | `8d0f891c` — "Add Vercel Web Analytics integration" |

### Changed Files
Only `package-lock.json` — identical change set to PR #3.

### Diff Summary (PR #4 vs main)
`git diff --stat main...origin/vercel/vercel-web-analytics-integrati-n58pdk`
```
package-lock.json | 12 ++++++++++++
1 file changed, 12 insertions(+)
```
**The diff is byte-for-byte identical to PR #3's diff against main.**

Both PRs add the exact same two lockfile changes:
1. `"dev": true` on `node_modules/fsevents`
2. New `node_modules/next-intl/node_modules/@swc/helpers` entry

### Comparison with main
Analytics code already in `main`. No code changes. PR #4 is a **direct duplicate of PR #3**.

### Check Results
```
[completed/success] Vercel Preview Comments   https://vercel.com/github
[completed/success] Build & Type Check        https://github.com/savdownload-spec/social-media-downloader/actions/runs/36904937482/job/110512990594
```
All checks pass (2/2 ✅).

### Vercel Deployment
- Status: `DEPLOYED`
- Preview URL: `social-media-downloader-git-vercel-vercel-web-a-58ab16-sav-down.vercel.app`
- Inspector: `https://vercel.com/sav-down/social-media-downloader/C1tEKauZCdz9PEbGen74DVWe5wrs`

### PR #4 Body Summary
Same conclusion as PR #3 — analytics already configured, only `package-lock.json` updated (ran `npm install`).

---

## PR #5 — Install and Configure Vercel Speed Insights

### Metadata
| Field | Value |
|-------|-------|
| Number | 5 |
| Title | Install and Configure Vercel Speed Insights |
| State | open |
| Draft | YES |
| Source branch | `vercel/install-and-configure-vercel-s-qp7ia2` |
| Base branch | `main` |
| Merged | NO |
| Additions | 54 |
| Deletions | 87 |
| Changed files | 3 |
| Author | Vercel Agent (bot) |
| Head commit | `2cd20bd1` — "Install and Configure Vercel Speed Insights" |

### Changed Files
1. `package.json` (+1 line)
2. `package-lock.json` (+51 additions, -87 deletions)
3. `src/app/layout.tsx` (+2 lines)

### Diff Summary (PR #5 vs main)
**`package.json`** — adds one new dependency:
```json
"@vercel/speed-insights": "^2.0.0",
```

**`src/app/layout.tsx`** — adds import and component:
```diff
+import { SpeedInsights } from '@vercel/speed-insights/next';
```
```diff
+        <SpeedInsights />
```
(placed after existing `<Analytics />`)

**`package-lock.json`** — 54 additions, 87 deletions. This is the problematic file:
- Adds `node_modules/@vercel/speed-insights` entry (v2.0.0)
- **Removes** `node_modules/happy-dom` and all its transitive deps (`ws`, `@types/ws`, `buffer-image-size`, `whatwg-mimetype`, `@types/whatwg-mimetype`)
- Changes several `"devOptional": true` entries to `"dev": true` for prisma packages
- Adds `"dev": true` to several `@types/*` entries

The lockfile was generated with `--legacy-peer-deps` (stated in PR body), which caused `happy-dom` and peer deps to be excluded from the lockfile.

### Comparison with main
`git diff --stat main...origin/vercel/install-and-configure-vercel-s-qp7ia2`
```
package-lock.json  | 138 ++++++++++++++++++++---------------------------------
package.json       |   1 +
src/app/layout.tsx |   2 +
3 files changed, 54 insertions(+), 87 deletions(-)
```
**Speed Insights is NOT currently in `main`.** This PR introduces new functionality.

### Check Results — FAILING
```
[completed/success] Vercel Preview Comments   https://github.com/savdownload-spec/social-media-downloader/runs/110516146564
[completed/failure] Build & Type Check        https://github.com/savdownload-spec/social-media-downloader/actions/runs/36905421391/job/110514635980
```
**Status: 1/2 checks fail — Build & Type Check FAILED.**

### Failing Check Analysis
**Workflow run:** CI / Build & Type Check (run `36905421391`)
**Failing step:** `Install dependencies` (`npm ci`)

**Root cause:**
The Vercel Agent installed dependencies using `--legacy-peer-deps` flag (noted in PR body), which causes `npm` to resolve peer dependencies differently. Specifically:
- `happy-dom` (a peer dep of `vitest`) was **removed** from the lockfile because legacy mode skips peer dep resolution
- `happy-dom`'s transitive deps (`ws`, `buffer-image-size`, `whatwg-mimetype`, etc.) were also removed
- The CI runs `npm ci` in strict mode — it requires the lockfile to be consistent with the package tree
- The inconsistent lockfile (peer deps removed, package tree not matching) causes `npm ci` to fail

In `main`, `happy-dom` is present in `package-lock.json` as `"peer": true` with all its transitive deps. The PR5 lockfile omits the entire `node_modules/happy-dom` block (and 5+ related packages), making the lockfile inconsistent for strict `npm ci`.

**Step execution log (from Actions API):**
```
[success]  Set up job
[success]  Checkout
[success]  Setup Node.js
[success]  Align npm version with package.json's packageManager field
[failure]  Install dependencies          ← npm ci fails here
[skipped]  Generate Prisma client
[skipped]  Lint
[skipped]  Build
[success]  Post Checkout
[success]  Complete job
```

### Vercel Deployment
Despite the CI failure, Vercel deployed successfully (Vercel uses its own build system, not the GitHub Actions CI):
- Status: `DEPLOYED`
- Preview URL: `social-media-downloader-git-vercel-install-and-3c6a3e-sav-down.vercel.app`
- Inspector: `https://vercel.com/sav-down/social-media-downloader/2JdR7YFjKGf3332yndFjXp1iL4ow`

### PR #5 Body Summary
Adds `@vercel/speed-insights@2.0.0` and integrates `<SpeedInsights />` in root layout. This is **genuinely new functionality** not present in `main`. However, the lockfile was generated incorrectly using `--legacy-peer-deps` causing CI failure.

---

## Step D — Comparison with main

### Analytics in main
**YES — confirmed.**

Evidence:
1. **`package.json`** on `main` contains:
   ```json
   "@vercel/analytics": "^1.3.2",
   ```
2. **`src/app/layout.tsx`** on `main` (line 22 and ~line 140):
   ```typescript
   import { Analytics } from '@vercel/analytics/next';
   ```
   ```tsx
   <Analytics />
   ```
3. **Commit history**: Added in commit `b75d045` ("prelaunch: tool inventory, LibreOffice capability check, vercel.json maxDuration, production architecture doc, analytics") — by the repo author directly on `main`.

### Speed Insights in main
**NO — NOT in main.**

Evidence:
1. `git show main:package.json` — `@vercel/speed-insights` is **not** in dependencies.
2. `git show main:src/app/layout.tsx` — `SpeedInsights` import/component does **not** appear.
3. `git diff --stat main...origin/vercel/install-and-configure-vercel-s-qp7ia2` shows `package.json` and `src/app/layout.tsx` as changed, confirming PR #5's changes are **not** yet in `main`.

---

## Step E — Analytics Verification in main

### package.json (main) — @vercel/analytics
```json
"@vercel/analytics": "^1.3.2",
```
Present in `dependencies`. ✅

### src/app/layout.tsx (main) — Analytics usage
```typescript
// Line 22:
import { Analytics } from '@vercel/analytics/next';

// Line ~140 (inside RootLayout return):
<Analytics />
```
Correct import path (`@vercel/analytics/next` for Next.js App Router). ✅
Placed at end of `<body>` tag, matching Vercel's official documentation. ✅

### Git log (main — last 20)
```
f04afe2 fix: reduce Vercel Function Storage footprint - scope binary tracing and externalize heavy deps
6e13c97 coverage: pinterest via yt-dlp, 4 AI text tools via Cloudflare — 43→48 active tools
b75d045 prelaunch: tool inventory, LibreOffice capability check, vercel.json maxDuration, production architecture doc, analytics
1408bb9 prelaunch: split/compress input validation, BLOB_READ_WRITE_TOKEN + CRON_SECRET in .env.example
5c2120e prelaunch: fix jpg-to-pdf SSRF, upload rate limit, MIME AND validation, fit param, size guards, vercel.json crons + maxDuration
53eb62a fix: ConversationView attach button icon Paperclip (was Plus)
250aec3 fix: Support AI entity context, download clarification, message limits, escalation attachment carry-over
2a78a18 perf/security: pre-launch audit fixes - SSRF, unbounded queries, DB indexes, cleanup cron, cache headers
28889a9 fix: Support AI - intent detection, per-tool howTo, entity filter, tool CTAs, attachment fix, typography
6a4c113 fix: AI chat escalation CTA only on canAnswer=false, file sends in chat with preview, broader accept types
db369f9 Support AI: compress-pdf howTo, paren-lists, source filtering, FAQ rotation, ticket attach
d8c8565 fix: support AI pricing/login/compress retrieval, attachment button, emoji tabs
21480b6 fix: support AI root cause - query contamination, pricing docs, full emoji picker
e60ddb8 fix: chatbot retrieval, functionalToolContent FAQs, source validation, back btn, emoji, language
805882e fix: support chatbot focus bug, bad retrieval, greetings, source links
c2f55e1 feat: FAQ-first chatbot - deterministic answers, synonym matching, AI optional
543c794 feat: AI-first support assistant with SavDown knowledge retrieval
cfa6706 chore: delete unused MediaShowcase component
73583c9 remove: MediaShowcase section from homepage (duplicate of AllToolsGrid)
884f306 feat: add subtle SVG pattern backgrounds to MediaShowcase tool cards
```

### Git log --all (analytics/vercel-related commits)
```
f04afe2 fix: reduce Vercel Function Storage footprint - scope binary tracing and externalize heavy deps
2cd20bd Install and Configure Vercel Speed Insights   ← PR#5 branch
8d0f891 Add Vercel Web Analytics integration           ← PR#4 branch
dd43e89 Install Vercel Web Analytics                   ← PR#3 branch
b75d045 prelaunch: ... analytics                       ← in main
5c2120e prelaunch: ... vercel.json crons + maxDuration ← in main
5613b77 fix: clear error when Blob storage isn't configured on Vercel ← in main
70c36ca Remove hardcoded savdown.com URLs from vercel.json ← in main
59ae5ce fix: switch database provider to PostgreSQL — SQLite has no persistence on Vercel ← in main
a0fa96b fix: bundle yt-dlp + ffmpeg so downloaders work on Vercel serverless ← in main
27b697a fix: resolve CI/Vercel build failures ← in main
```

---

## Step F — Speed Insights Verification in main

### package.json (main) — @vercel/speed-insights
**NOT present.** Only `@vercel/analytics` and `@vercel/blob` appear under `@vercel/` scope.

### src/app/layout.tsx (main) — SpeedInsights
**NOT present.** No import or component for `SpeedInsights` found.

---

## Step G — Vercel Branch/Deployment Info

### Remote branches
```
origin/HEAD -> origin/main
origin/billing
origin/main
origin/vercel/install-and-configure-vercel-s-qp7ia2     ← PR #5
origin/vercel/install-vercel-web-analytics-w9n4ra        ← PR #3
origin/vercel/vercel-web-analytics-integrati-n58pdk      ← PR #4
```

### Branch usage by Vercel
The `.vercel/` config and `vercel.json` do NOT reference specific branches — Vercel tracks branches via GitHub integration, not by name in config files. All three PR branches have active Vercel preview deployments (status: `DEPLOYED`).

| Branch | Vercel Preview URL | Status |
|--------|--------------------|--------|
| `vercel/install-vercel-web-analytics-w9n4ra` (PR#3) | `social-media-downloader-git-vercel-install-verc-6529f3-sav-down.vercel.app` | DEPLOYED |
| `vercel/vercel-web-analytics-integrati-n58pdk` (PR#4) | `social-media-downloader-git-vercel-vercel-web-a-58ab16-sav-down.vercel.app` | DEPLOYED |
| `vercel/install-and-configure-vercel-s-qp7ia2` (PR#5) | `social-media-downloader-git-vercel-install-and-3c6a3e-sav-down.vercel.app` | DEPLOYED |

---

## Raw `gh pr checks` Output (via GitHub API)

### PR #3 — `dd43e895`
```
[completed/success]  Vercel Preview Comments    https://vercel.com/github
[completed/success]  Build & Type Check         https://github.com/savdownload-spec/social-media-downloader/actions/runs/36903417678/job/110507891071
```

### PR #4 — `8d0f891c` (sha4 not captured separately, same pattern)
```
[completed/success]  Vercel Preview Comments    https://vercel.com/github
[completed/success]  Build & Type Check         https://github.com/savdownload-spec/social-media-downloader/actions/runs/36904937482/job/110512990594
```

### PR #5 — `2cd20bd1`
```
[completed/success]  Vercel Preview Comments    https://github.com/savdownload-spec/social-media-downloader/runs/110516146564
[completed/failure]  Build & Type Check         https://github.com/savdownload-spec/social-media-downloader/actions/runs/36905421391/job/110514635980
```

---

## Summary Table

| PR | Purpose | Changes already in main? | Unique useful changes? | Checks | Vercel deployment | Recommended action |
|----|---------|--------------------------|------------------------|--------|-------------------|--------------------|
| #3 | Install Vercel Web Analytics (lockfile update only — analytics already existed) | YES — analytics already in main at `b75d045`; only diff is a minor lockfile metadata change | NO — lockfile-only, no code | ✅ 2/2 pass | DEPLOYED preview | Close PR + delete branch (redundant) |
| #4 | Add Vercel Web Analytics integration (duplicate of #3 — identical lockfile diff) | YES — analytics already in main; diff is byte-for-byte identical to PR #3 | NO — duplicate of #3 | ✅ 2/2 pass | DEPLOYED preview | Close PR + delete branch (redundant duplicate) |
| #5 | Install and Configure Vercel Speed Insights | NO — Speed Insights not in main | YES — new dep + new component | ❌ 1/2 fail (Build & Type Check fails at `npm ci`) | DEPLOYED preview | Do NOT merge yet — CI fails due to broken lockfile (generated with `--legacy-peer-deps`). Needs lockfile regeneration before it can pass CI. |

---

## Final Summary

**Analytics in main: YES**
- `@vercel/analytics@^1.3.2` in `package.json`
- `import { Analytics } from '@vercel/analytics/next'` in `src/app/layout.tsx` (line 22)
- `<Analytics />` rendered in `<body>` (line 140)
- Added in commit `b75d045` directly by the repo owner

**Speed Insights in main: NO**
- Package not in `package.json`
- Component not in `src/app/layout.tsx`
- PR #5 is the only place it exists (branch only)

**Any PR requiring merge: NO (none are safe to merge as-is)**
- PR #3: Redundant — analytics already in main, only lockfile noise
- PR #4: Redundant — exact duplicate of PR #3
- PR #5: Speed Insights is new/useful, but CI fails due to broken lockfile; would need a fresh `npm install` (without `--legacy-peer-deps`) to regenerate a consistent lockfile before it could be merged

**Billing branch: UNTOUCHED** — `origin/billing` was not inspected or modified.
