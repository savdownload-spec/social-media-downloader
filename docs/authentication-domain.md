# SavDown domain redirects and authentication

## Confirmed incident

Public, cookie-free GET requests made during this investigation returned:

| Request | Status | Location |
| --- | --- | --- |
| `https://getsavdown.com/` | 308 | `https://www.getsavdown.com/` |
| `https://www.getsavdown.com/` | 308 | `https://getsavdown.com/` |
| `http://getsavdown.com/` | 308 | `https://getsavdown.com/` |
| `http://www.getsavdown.com/` | 308 | `https://www.getsavdown.com/` |
| `https://getsavdown.com/login?callbackUrl=%2Fworkspace` | 308 | Same path/query on `https://www.getsavdown.com` |
| `https://www.getsavdown.com/login?callbackUrl=%2Fworkspace` | 308 | Same path/query on `https://getsavdown.com` |
| `https://getsavdown.com/api/auth/providers` | 308 | Same path on `https://www.getsavdown.com` |
| `https://social-media-downloader-sav-down.vercel.app/` | 200 | None |
| `https://social-media-downloader-sav-down.vercel.app/workspace` | 307 | `/login?callbackUrl=/workspace` |

The exact loop is **HTTPS root -> HTTPS www -> HTTPS root**, both 308. It occurs before middleware, session validation, or Google authentication, even without cookies. HTTP enforcement adds an initial HTTPS hop and then enters the same loop. DNS and TLS already permit these responses; no DNS change is justified by this evidence.

The root-to-www response is served by Vercel without the application's configured security headers. The reverse response includes those headers and matches the explicit host redirect previously in `next.config.js`. This establishes an upstream Vercel-served root-to-www redirect conflicting with the application's www-to-root rule. The exact dashboard setting responsible cannot be inspected without authenticated Vercel access; check Domains first, then project-level Routing Rules if necessary.

## Repository changes

- `next.config.js`: removed the application host redirect. Vercel Domains is now the single intended owner of host canonicalization; Vercel also handles HTTP-to-HTTPS. **This code change alone does not make the root domain canonical: the upstream root-to-www redirect must be removed manually.** The existing Production-only `NEXTAUTH_URL=https://getsavdown.com` build setting is retained.
- `src/app/login/LoginClient.tsx`: login now requires `session.user.id` before automatically navigating, matching the protected server routes. The JWT/session callbacks intentionally remove that ID for invalidated sessions while retaining a user object. Previously that object could trigger login -> workspace -> login repeatedly. Login also respects `suspended=1`, displaying an explanation and avoiding automatic workspace navigation or Google initiation. The workspace's suspension guard remains enforced. These are additional loops identified by source inspection, not the cause of the public-domain 308 loop.
- This document records the evidence, required external fix, and live verification steps.

## Authentication review

- Next.js 14.2.18 with NextAuth v4; not Auth.js v5. `src/app/api/auth/[...nextauth]/route.ts` exports the NextAuth GET/POST handler with `src/lib/auth.ts` options.
- The old deployment's public `/api/auth/providers` endpoint returned Google's callback as **`https://getsavdown.com/api/auth/callback/google`** and sign-in URL as `https://getsavdown.com/api/auth/signin/google`. The canonical domain's endpoint was intercepted by the domain redirect. This confirms the deployed provider URL on that deployment, not successful OAuth or the Google Console allowlist.
- The installed NextAuth `detectOrigin` prioritizes `NEXTAUTH_URL`. On Vercel, if absent, it uses forwarded host/protocol. React server helpers also use `NEXTAUTH_URL_INTERNAL` and fall back to `VERCEL_URL`. This version does not use `AUTH_URL` to select the origin. Existing Production build pinning avoids a stale old-domain auth URL; Preview/local builds retain their own configuration.
- No custom redirect callback, cookie domain, cookie names, `useSecureCookies`, or HTTPS-enforcement middleware is configured. Default NextAuth redirects allow relative and same-origin destinations. HTTPS selects secure, HttpOnly, SameSite=Lax, host-only cookies. No custom proxy or trust-host override is needed for this incident.
- Middleware excludes `/api`, so OAuth/session handlers bypass it. Legacy locale prefixes redirect once after stripping the prefix (301). A valid root referral link can redirect to login (307). Maintenance uses a rewrite (503), not a login redirect; login and maintenance are bypass paths. No middleware host/HTTPS redirect exists.
- Workspace/account routes check the server session's user ID. Workspace also checks suspension using the current database state. JWT password-change invalidation and role revalidation remain intact.
- `vercel.json` selects Next.js, runs `npm run db:deploy && npm run build`, and defines functions/crons. It has no redirects, rewrites, or authentication URL settings. No repository rewrite sends traffic to the old Vercel host.
- `src/config/site.ts` chooses metadata/site URLs from `NEXT_PUBLIC_SITE_URL`, then `NEXTAUTH_URL`, then `VERCEL_URL`. Metadata does not issue HTTP redirects. Set the public site URL explicitly in Production.
- Current remote Production/Preview environment variables, dashboard framework overrides, domain configuration, and Google Console settings were not accessible. No Vercel CLI credential or connected Vercel integration was available. The historical `.env.production.local` snapshot lacks both URL variables and has an empty `VERCEL_URL`; it is not evidence of current remote values. Local `.env.local` uses localhost. Secrets were neither printed nor modified.

## Required Vercel changes (root cause fix)

In the existing **social-media-downloader** project, Settings > Domains:

1. Edit **getsavdown.com**: connect it directly to the **Production** environment/deployment, with **no redirect**. Remove the current redirect to `www.getsavdown.com`. If a separate Primary designation is shown, select the root domain.
2. Edit **www.getsavdown.com**: configure a **308 permanent redirect to `https://getsavdown.com`**, preserving path and query. It must not point at the Vercel hostname. Do not select the opposite, root-to-www recommendation.
3. Review any project-level Routing Rules/Bulk Redirects for an additional root-to-www or old-host destination; remove a conflicting rule if present. Both custom domains should retain valid certificates. Keep Vercel's HTTPS enforcement; add no application-level forwarded-protocol redirect.
4. The old `social-media-downloader-sav-down.vercel.app` hostname currently serves directly. It is not a destination of the root/www loop and need not be changed to fix it. Leave it available for existing users/rollback; never redirect the canonical domain to it. Avoid blanket `*.vercel.app` redirects, which would affect Preview and in-progress OAuth sessions.
5. Inspect dashboard framework/build overrides against `vercel.json` (Next.js; existing install/build commands). No framework or DNS change is required by the evidence.

Apply the domain correction first: the currently deployed www-to-root application rule will then agree with Vercel, breaking the confirmed loop. Deploy this repository change afterward to remove the duplicate application rule. Verify the Domains changes even if deployment succeeds; a deployment cannot override an upstream redirect.

### Environment variables

Review Production, Preview, and branch-specific overrides. The current remote values have **not** been verified.

| Variable | Production | Preview |
| --- | --- | --- |
| `NEXTAUTH_URL` | `https://getsavdown.com`, no path or trailing slash | The stable Preview origin where sign-in starts; register its exact Google callback. Never inherit the Production origin. |
| `NEXT_PUBLIC_SITE_URL` | `https://getsavdown.com` | The appropriate Preview origin. |
| `NEXTAUTH_URL_INTERNAL` | Leave unset unless intentionally required; remove stale old-domain overrides | Likewise; do not point Preview at Production. |
| `AUTH_URL` | Not consumed by this NextAuth v4; remove a stale value or align if other tooling uses it | Align to Preview if needed by other tooling. |
| `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL` | Keep Vercel-managed values | Keep Vercel-managed values. |
| `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Preserve existing values | Preserve existing environment-specific values. |

A fresh Production deployment is required after environment/source changes because Next.js embeds configured values at build time. Do not rotate the auth secret or change session-cookie scope/names to fix redirects. Existing valid root-domain sessions should remain usable. Cookies on the old Vercel hostname or www cannot transfer to the root domain; those visitors may need one new sign-in, with their existing account retained. Preview OAuth must start and finish on its own registered stable hostname; ephemeral previews without registered callbacks should not be used for Google sign-in verification.

## Google Cloud Console

In the existing Web application OAuth client matching `GOOGLE_CLIENT_ID`, verify that Authorized redirect URIs contains exactly:

`https://getsavdown.com/api/auth/callback/google`

Add it only if missing; the code and deployed provider endpoint already use this callback. Do not create a new client or rotate credentials. Retain existing allowed callbacks for local/Preview/rollback and in-progress old-host flows. If an Authorized JavaScript origin is needed for other Google integrations, use `https://getsavdown.com` without a path; it does not replace the required server OAuth callback. Keep the authorized domain and app homepage/privacy/terms branding aligned with getsavdown.com. Console access was unavailable, so no Console change can be confirmed necessary beyond checking the callback allowlist.

## Live verification (user performed)

No local tests, build, lint, development server, or local authentication procedures were run. Only source/diff inspection and public live GET requests were performed. Nothing was committed, pushed, merged, deployed, or changed remotely. **The incident is not confirmed resolved until the user verifies the live deployment.**

Use the browser Network panel with Preserve log and Disable cache. First retain existing cookies to verify session preservation; use a private window separately for signed-out checks. A browser can retain an earlier permanent redirect, so use a fresh private session if its observed chain differs from the corrected live response. Clearing all users' cookies is not the fix.

- [ ] `https://getsavdown.com/`: serves without redirect errors and never redirects to www or the Vercel hostname.
- [ ] `https://www.getsavdown.com/`: exactly one 308 to `https://getsavdown.com/`, then the page loads. Also check `/login?callbackUrl=%2Fworkspace` preserves its path/query.
- [ ] `http://getsavdown.com/`: 308 to HTTPS root, then loads. `http://www.getsavdown.com/` may first upgrade to HTTPS www, then redirect to HTTPS root; neither HTTPS URL may point back to HTTP or www from root. HSTS can make the browser's first upgrade internal.
- [ ] Google Sign-In: the authorization request's `redirect_uri` is `https://getsavdown.com/api/auth/callback/google`; it returns to the existing account on root and the requested workspace. Do not share OAuth codes, state, or cookie values.
- [ ] Existing root session: open `/workspace`, refresh, and navigate within the workspace without returning to login. Repeat after a fresh Google sign-in.
- [ ] Logout, then sign in again: both complete and remain on root. Signed-out `/workspace` redirects once to login and waits for user sign-in.
- [ ] If applicable, a password-invalidated session stays at login instead of bouncing to workspace; a suspended account displays the suspension message and remains unable to enter workspace.
- [ ] If Preview OAuth is configured, it starts and finishes on that Preview's registered hostname.

References: [Vercel domain redirects](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting), [NextAuth v4 options and cookies](https://next-auth.js.org/configuration/options), [Google web-server OAuth URI requirements](https://developers.google.com/identity/protocols/oauth2/web-server).
