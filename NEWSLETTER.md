# SavDown Monthly Update

## Setup and rollout

The existing Next.js App Router endpoint is `POST /api/newsletter`; the existing
homepage component remains the only signup UI. Prisma/PostgreSQL owns subscriber
metadata. Kit handles marketing delivery; SMTP/authentication emails are unchanged.

1. Select Kit's Free plan and create a dedicated Monthly Update form. Kit currently
   includes API access on Free: https://help.kit.com/en/articles/16627071-the-kit-free-plan
2. Create a V4 key in Kit Settings > Developer. Set server-only `KIT_API_KEY` and
   the form's numeric `KIT_FORM_ID` in `.env.local` and your deployment environment.
   Never use NEXT_PUBLIC variables. No Kit client SDK or embedded form is loaded.
3. Configure the existing Redis backend (`UPSTASH_REDIS_REST_URL` plus
   `UPSTASH_REDIS_REST_TOKEN`, or `REDIS_URL`). Newsletter limiting fails closed
   when Redis is missing/unavailable. An existing/free Redis tier is sufficient.
   The host must overwrite trusted client-IP headers; don't expose a self-hosted
   origin behind a proxy that accepts arbitrary X-Forwarded-For from visitors.
4. Apply `prisma/migrations/20261015_newsletter_provider/migration.sql` to the
   intended PostgreSQL database before deploying, then run `npx prisma generate`.
   Use the repository's migration history/baseline procedure; do not blindly run
   all historical migrations against an already populated database. Back up the
   subscriber table first. This migration merges casing/whitespace duplicates,
   keeps the earliest identity/date and preserves any opt-out, then enforces
   normalized uniqueness. Existing local-only rows are marked `legacy` rather
   than falsely claiming that Kit accepted them. No bulk enrollment is performed.
5. Verify a consented test address appears in the correct Kit form and compare
   its provider ID/state with the SavDown record. Repeat the submission and verify
   one record and no repeated welcome email. Configure sender identity, address,
   footer/unsubscribe links and sending domain in Kit before sending broadcasts.

No paid Kit feature is required. Upgrading Kit requires no website flow changes.

## Provider contract and state

`src/lib/newsletter/service.ts` coordinates persistence; `provider.ts` defines the
small provider contract, and `kit.ts` implements it. Replace the provider passed to
`subscribeNewsletter` (or its default factory) to migrate. The UI and API contract
stay unchanged. Export normalized email, status, source, dates and provider IDs
from SavDown, reconcile suppression states with Kit, then import only eligible
subscribers into the replacement provider. Do not migrate a stale active flag as
proof of current consent. `providerListId` allows a future form change without
mistaking the old membership for the new one.

Kit V4 uses `POST /v4/subscribers` (email upsert) followed by
`POST /v4/forms/{form_id}/subscribers` (idempotent form membership):
- https://developers.kit.com/api-reference/subscribers/create-a-subscriber
- https://developers.kit.com/api-reference/forms/add-subscriber-to-form-by-email-address

New subscribers use Kit's default active state (single opt-in). Do not describe
this as guaranteed double opt-in: the form/incentive behavior must be verified in
Kit. The UI does not promise a confirmation email. Returned inactive states are
stored as pending; cancelled/bounced/complained addresses are never reactivated
or added to a form. Kit's suppression and unsubscribe handling stays authoritative.
Do not send from the local table directly.

The endpoint trims/lowercases email, limits body size, validates via Zod, checks
same-origin requests, uses IP and hashed-email Redis limits, and ignores honeypot
submissions. It needs no session. Existing and new addresses receive the same
acknowledgement; the browser remembers a successful submission only in memory.
No email is stored in browser storage or sent to analytics. Existing Vercel page
analytics remain unchanged: this repository has no established custom event
pipeline, so no new analytics dependency or duplicate signup events are added.

Postgres transaction advisory locks serialize same-email requests across instances.
Only a successful, validated provider response is persisted. Transactions are
bounded at 20 seconds, with a shared 12-second provider timeout. Concurrent
same-email requests get a retryable generic failure. If Kit succeeds and the
commit fails, a retry safely repeats its email upsert/form membership. Completed
memberships bypass further provider calls. Safe diagnostic codes are logged;
provider response bodies, API keys and emails are never explicitly logged.

## Unsubscribe synchronization

This first version records the provider result at signup, not a continuously
synchronized delivery state. Kit controls unsubscribes, bounces and complaints.
There is no public status lookup or fake unsubscribe endpoint. Repeat submissions
do not undo an unsubscribe or resend confirmation. Resubscription should use
Kit's supported consent flow. Before adding local campaigns or exporting a list
for delivery, add signed Kit webhooks for activation/unsubscribe/bounce/complaint,
verify signatures, deduplicate event IDs, handle out-of-order deliveries, and add
periodic reconciliation. Update `status`, `active`, `subscribedAt` and `updatedAt`
in the existing table. See https://developers.kit.com/ for current webhook docs.

## Testing

- `npx vitest run src/lib/newsletter src/app/api/newsletter`
- `npx tsc --noEmit`, `npm run lint`, `npm run build`
- Start `npm run dev` with a dedicated test database, Redis and Kit form.
- On the actual homepage, check empty/invalid input, Enter submission, loading,
  success, repeat email, rapid clicks, refresh, and network/API failure.
- Check desktop/mobile and light/dark, keyboard focus, live status announcement,
  preserved input, layout stability and browser console.
- Unit tests mock provider/Prisma/Redis; they do not prove live delivery or database
  behavior. Live Kit verification requires credentials and a consented test email.
- Verify normalized DB uniqueness and concurrent submissions against PostgreSQL;
  simulate a DB write failure after Kit success and retry before production rollout.

## Verification in this checkout (2026-10-15)

Newsletter-specific checks: 44 tests passed, covering provider errors/timeouts,
validation, suppression, duplicates, recovery, rate-limit configuration and form
interactions. TypeScript and lint passed (existing unrelated lint warnings).
The full suite had 140 passing tests and one unrelated PDF rendering failure:
`pdftoppm` is not installed/on PATH in this Windows environment.

The production build completes, but the existing DATABASE_URL has the wrong
protocol for the PostgreSQL schema and causes fallback-data warnings. Correct it
before live database testing. No database migration has been applied by this task.
Kit credentials, form ID and Redis configuration were absent. No actual subscriber
was enrolled. Browser discovery found no available sessions, and the native
Windows automation helper was unavailable; desktop/mobile/light/dark and live
provider verification remain required before claiming production readiness.
