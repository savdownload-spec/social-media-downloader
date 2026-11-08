# SavDown Admin investigation and repair

Date: 2026-11-08. Live runtime verification remains pending. The owner subsequently requested committing and pushing this repair.

## Evidence and limits

- Inspected Admin routes, server layout, NextAuth callbacks, middleware, Admin APIs, Prisma schema/migrations, shared shell/providers, client components, storage helpers, and service worker.
- The supplied screenshot shows rendered Admin HTML without CSS (browser-default fonts, blue links, unpositioned sidebar).
- Read-only HTTP inspection of the live homepage and unauthenticated `/admin` found that `/admin` redirects to login. Both stylesheet URLs in the returned HTML responded with HTTP 200 and `text/css`; the global stylesheet contains Tailwind utilities and the Admin palette. This rules out universally missing production CSS assets, but does not establish what happened inside the authenticated browser.
- No authenticated browser session or Vercel runtime-log connector was available. Browser Console/Network errors and Vercel logs were requested. The exact browser-side trigger for stylesheet loss remains unverified.
- Database inspection used the existing `PROD_DIRECT_URL` inside a transaction explicitly set to READ ONLY. Every scalar field in the installed Prisma client's model metadata exists in that database. All six recorded migrations completed; three users have the ADMIN role. No missing-column defect was found. Confirm in Vercel that the deployment targets this same database; deployed environment variables were not accessible.
- All 59 stored tool configurations in the inspected database are LIVE. None are DISABLED, MAINTENANCE, or COMING_SOON. No tool status or setting was changed. The two suspected disabled tools were not identified by name, so provider failures or a different deployed database cannot be ruled out.
- No local tests, builds, lint, type checks, local servers, browser tests, or test data were run/created. Review consisted of source inspection, Git diffs, read-only production HTTP requests, and read-only database metadata/configuration queries.

## Confirmed code defects and repairs

| Problem and affected functionality | Source and repair |
| --- | --- |
| The latest Google-tag commit (`ef5ea71`) assigned raw `innerHTML` to the entire document head, although Next.js injects stylesheet links and metadata into that same head. Client rendering/recovery can replace those managed nodes. This is a concrete stylesheet-loss path consistent with the screenshot; its occurrence in the user's session is not independently confirmed. All Admin sections share this head. | `src/app/layout.tsx`: restore a normal framework-managed head; inject raw text only into individual script elements. Preserve the Google tag, initialization, theme script, and structured data. No public visual redesign or processing behavior changes. |
| Dashboard depended on its parent layout for permission enforcement while starting queries and stale-operation reconciliation itself. Layout/page rendering can occur concurrently; the layout is not a sequential authorization barrier for page work. | `src/app/admin/page.tsx`: require an authenticated ADMIN session before queries or reconciliation. The existing database-backed role-refresh callback and layout role check remain intact. |
| Unauthenticated Admin entry discarded the destination. Login defaults to `/account` when no callback is supplied. | `src/app/admin/layout.tsx`: send login a `/admin` callback. Dashboard uses the same redirect. Individual nested destinations are not retained. |
| Tools GET created missing configuration records with LIVE status and zero cost merely by opening the page. | `src/app/api/admin/tools/route.ts`: remove provisioning from this read endpoint and return existing persisted records with private/no-store headers. Existing rows and the status-write API remain unchanged. New tool configuration rows must be provisioned deliberately, rather than on an Admin page visit. |
| Tools status/batch-limit saves, Settings saves, and AI Image configuration saves had no exception cleanup around fetch. A rejected request skipped the loading reset, leaving controls stuck. Batch limits also silently truncated fractional input or converted invalid input into a default reset. | `src/components/admin/AdminToolsClient.tsx`, `AdminSettingsClient.tsx`, `AdminAiImageClient.tsx`: handle failures, require successful HTTP/API responses, and release loading state in finally. Tools validates positive whole-number limits before sending; successful status updates use the returned status/timestamp. |
| Content list responses omitted `contentJson`. Edit opens the list object directly, so rich articles were reconstructed from Markdown instead of the saved Tiptap document; autosave could persist that lossy reconstruction. The internal-links filter explicitly stripped the same field. | `src/app/api/admin/content/route.ts`: include saved JSON for both list paths. Existing editor initialization already prefers this JSON. No articles were opened or saved during investigation. |
| Content “Needs Attention” appended SEO predicates to the search OR, returning articles matching either criterion rather than both. | `src/app/api/admin/content/route.ts`: apply the SEO alternatives as an AND condition alongside the search OR. |
| Settings GET returned nearly all AdminSetting rows, and Save submitted/upserted that entire snapshot. Saving an old Settings tab could overwrite newer AI configuration or other editors' rows. Independent writes could also partially succeed. | `src/app/api/admin/settings/route.ts`: allow only this form's known settings in reads/writes; preserve dedicated pricing/AI/provider rows; save the accepted settings in one transaction. Maintenance retains its separate guarded endpoint. |
| User-detail page props and GET responses spread complete User records, including password hashes and password-change timestamps, into browser-visible data. | `src/app/admin/users/[id]/page.tsx`, `src/app/api/admin/users/[id]/route.ts`: omit those authentication fields before serialization. No credentials or account records were modified. |
| Service worker cached successful authenticated Admin HTML and could replay it offline after logout. | `public/sw.js`: exclude `/admin` and descendants from interception, and remove previously cached Admin responses on worker activation. Public navigation/asset caching remains as before. This does not diagnose the screenshot's CSS failure by itself. |
| AI Image Generator and Backup & Restore existed in the sidebar but lacked header titles and search entries. | `src/components/admin/AdminHeader.tsx`: add the missing entries, preserving sidebar/navigation design. |
| Support PATCH responses were merged into selected detail, but reassignment returned a scalar assignedAdminId while the select uses the assignedAdmin relation. Replies can reopen conversations, but their response was only appended as a message, leaving the displayed status stale. Enter could also resubmit while a request was saving. | `src/components/admin/AdminSupportInbox.tsx`: reload saved detail after updates and guard submissions while saving. |
| Support caught database/server exceptions and returned a generic invalid-input response, masking their source from both the browser and relevant application logs. | `src/app/api/admin/support/[id]/route.ts`: retain validation errors as client errors; log unexpected failures with conversation/admin context and return HTTP 500. |

## Existing Admin coverage

All of these routes exist and were inspected at source level. Runtime interactions remain for live review.

| Section | Route | Existing functionality reviewed |
| --- | --- | --- |
| Dashboard | `/admin` | Real database counts, charts, recent operations, review summary, authorization, reconciliation dependency |
| Users | `/admin/users`, `/admin/users/[id]` | Lists/search/plan filters, account details, credit adjustments, roles, suspension, deletion protections, plan/subscription actions, notification retries, export preview/history/download |
| Reviews | `/admin/reviews` | Status/search, edit, approve/reject, feature/unfeature, delete, notification links |
| Support | `/admin/support` | Inbox filters/folders, conversation detail, assignment, priorities/status, replies, internal notes, attachments, translation, notifications |
| Tools | `/admin/tools` | Persisted statuses/costs, usage totals, search/status filters, per-plan batch limits |
| AI Image Generator | `/admin/ai-image` | Stored model/cost/limit settings; provider credentials remain server environment configuration |
| Usage | `/admin/usage` | Date/tool/platform/status/search filters, ledger rows, groupings, pagination, reconciliation dependency |
| Credits | `/admin/credits` | Ledger, transaction filters, real balance/aggregate summaries and reconciliation delta |
| Subscriptions | `/admin/subscriptions` | Provider subscription records, search/status filters, notification focus; actions live under user details |
| Payments | `/admin/payments` | Provider payments plus explicit legacy credit-purchase records, search/pagination/notification focus |
| Pricing | `/admin/pricing` | Shared persisted pricing schema, editing/reordering/visibility/archive, billing-history deletion protections, cache invalidation |
| Affiliates | `/admin/affiliates` | Approval/suspension, tracked referral/reward history and totals, filters/notification focus |
| Blog / Content Studio | `/admin/content` | Posts, categories on posts, search/SEO filters, editor/autosave, publish/schedule, media, SEO controls, revisions and restore API |
| Comments | `/admin/comments` | Search/status filters, moderation/delete, report details, author/article links, notification focus |
| Reports | `/admin/reports` | Usage/users/subscriptions/credits reports, date/search, pagination, CSV export |
| Audit Log | `/admin/audit` | Real stored audit records, search, expanded details |
| Backup & Restore | `/admin/backups` | Private-storage requirement, history/create/download/delete, archive preview/confirmation/recovery/restore flow; no backup or restore was executed |
| Settings | `/admin/settings` | Tabs, stored settings, maintenance, separate ownership of pricing and AI config |

There is no standalone Categories Admin route or category CRUD API. Tool categories are configuration fields, and article category is edited in Content Studio. There is no standalone Newsletter Admin page or subscriber-management API under `/api/admin`; the repository has newsletter submission/provider integration, the subscriber model/count, a Settings toggle, and backup support. No missing sections were fabricated.

## Remaining limitations and configuration checks

1. Deploy the changes through the owner's normal process. During investigation, no deployment, commit, push, merge, or PR was performed; the owner subsequently authorized committing and pushing the repair. A restored live Admin has not been claimed.
2. Obtain authenticated browser Console/Network output and Vercel logs if the unstyled view persists. Verify stylesheet links survive hydration, have CSS MIME types, and load from the active deployment. The unauthenticated live CSS requests succeeded during this investigation.
3. Verify Vercel DATABASE_URL/DIRECT_URL point to the inspected intended database, and NEXTAUTH_SECRET, NEXTAUTH_URL, ADMIN_EMAILS, OAuth callbacks, and Redis are configured correctly. Credential login intentionally fails closed when the production rate limiter is unavailable; this security behavior was preserved. The local `.env.production.local` DATABASE_URL is not a valid PostgreSQL URL; that local snapshot was not edited and does not prove a live Vercel misconfiguration.
4. Blog media/user exports require BLOB_READ_WRITE_TOKEN on Vercel. Backup & Restore requires its dedicated private BACKUP_BLOB_READ_WRITE_TOKEN or BACKUP_BLOB_STORE_ID. AI generation, translation, email notifications, and Stripe/Safepay actions need their existing provider configuration. Those live credentials/providers were not exercised.
5. Several pre-existing Settings controls only persist rows and have no public consumers: site name/tagline, legacy credit allowance fields, reviews-enabled/approval flags, and newsletter-enabled flag. Actual branding comes from site config and allowances from pricing/billing. Wiring these controls would change public behavior, so it was left outside this repair. Do not assume these switches enforce public behavior after saving.
6. Pricing and AI config GET already fall back to code defaults when stored configuration is malformed. That existing behavior was not changed; live review must confirm the displayed offers/models match intended stored configuration before saving.
7. User export storage currently uses public Vercel Blob URLs with random suffixes, despite downloads being proxied through an Admin-authenticated endpoint. The proxy does not make an underlying public URL private. No exports were generated or moved; a private-storage migration and handling existing exports remains a separate data-protection issue.
8. Existing automatic data lifecycle behavior remains: authorized dashboard/usage/report reads can reconcile stale operations; user-detail refresh can refill allowances; Content reads can publish due scheduled posts; export-history reads expire old files. None of those application endpoints were invoked with an authenticated session during investigation.

## Live review checklist after deployment

- [ ] Visit `/admin` logged out; sign in as an existing admin and return to Admin. Verify a normal user is denied and Admin APIs reject unauthorized calls.
- [ ] Confirm styling on direct load, refresh, and navigation from the public site; inspect Console/Network for failed CSS/JS, hydration errors, and server errors.
- [ ] Confirm dashboard metrics/charts load from real records. Review reconciliation-related logs if it fails.
- [ ] Navigate every section in the coverage table using the sidebar; check mobile drawer, collapse, header titles, search, bell links, and back-to-site link.
- [ ] Verify Users filters/pagination/detail and exports. Use an owner-approved account for any credit/plan/role/subscription actions; check the intended record and ledger/audit entry after saving.
- [ ] Confirm Tools displays the intended stored statuses. Identify the two suspected tools and confirm intended configuration before changing either. Check batch-limit validation/save, refresh persistence, and failure recovery without inadvertently changing status.
- [ ] Verify AI Image models/costs/limits match intended configuration; check save/error recovery and provider availability only when intended.
- [ ] Check Usage, Credits, Payments, Subscriptions, Affiliates, Reports, and Audit data/filters/pagination; compare displayed records with known existing records. Check report/export downloads.
- [ ] Check Support filters, conversation loading, assignment/status/priority persistence, replies/internal notes, attachments, translation, unread indicators, and updated controls after saves.
- [ ] Check Reviews and Comments search/status/moderation/forms against an approved record; confirm badges refresh.
- [ ] Open an existing rich article and verify images/tables/callouts/formatting load intact. Check search plus Needs Attention together. Use an approved draft for autosave, preview, publish/schedule, media, and revision checks.
- [ ] Confirm Settings tabs load/save; verify saving General Settings does not change AI/pricing configuration. Respect the legacy-setting limitations above. Do not enable maintenance during ordinary public-site review.
- [ ] Verify Backup history/private storage and permitted download/create behavior. Any restore/delete needs a separate deliberate owner decision; this investigation did not perform one.
- [ ] Log out, revisit Admin, and check browser Back/offline behavior after the updated worker activates. Confirm expired sessions, ordinary-user sessions, and demoted admins cannot fetch protected data.
- [ ] Confirm the public homepage, login, workspace, pricing display, and visitor tools retain their existing behavior/design.

## Preservation

No production database records, users, credits, payments, subscriptions, support messages, pricing values, tool statuses, or other stored configuration were manually modified. No database reset, seed, migration, or cleanup was executed. No public design, public processing route, pricing configuration, or authentication policy was rewritten. The two shared changes are the framework-safe head rendering and Admin-only service-worker exclusions; public scripts and public caching behavior are preserved. Git was initially clean, so no unrelated existing modifications were overwritten.
