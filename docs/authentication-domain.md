# SavDown Google authentication domain

## Investigation

- Next.js 14.2.18; NextAuth v4 (`^4.24.10`, lockfile resolves 4.24.15), not Auth.js v5.
- `src/app/api/auth/[...nextauth]/route.ts` exports NextAuth GET/POST handlers using `src/lib/auth.ts`.
- Google uses the existing `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, with `prompt=select_account`. No custom Google redirect URI is supplied.
- The installed NextAuth server's `detectOrigin` gives `NEXTAUTH_URL` precedence over request headers. With it unset, Vercel requests use `x-forwarded-host`/`host`. NextAuth's React server helpers separately fall back to `VERCEL_URL`. The provider callback is generated from the resolved origin plus `/api/auth/callback/google`.
- `AUTH_URL` is not the URL setting used by this installed version. Changing only that variable or adding a Google-authorized URI does not change the generated callback.
- No hardcoded `social-media-downloader-sav-down.vercel.app` or other `vercel.app` hostname was found in tracked application/authentication source. `src/config/site.ts` uses `NEXT_PUBLIC_SITE_URL`, then `NEXTAUTH_URL`, then `VERCEL_URL`.
- The saved `.env.production.local` snapshot contains neither `NEXTAUTH_URL` nor `NEXT_PUBLIC_SITE_URL`; it has an empty `VERCEL_URL`. This is a historical local snapshot, not proof of current Vercel settings. Local `.env.local` correctly uses localhost. Secret values were not printed or changed.
- Current Vercel Production/Preview settings and Google Cloud configuration could not be inspected: no authenticated Vercel connection or CLI credentials were available. The public provider endpoint could not be read because the domain did not resolve from this environment. Therefore the exact live cause (stale `NEXTAUTH_URL`, host selection, or published Google branding) remains unconfirmed.

The application-side cause of an old generated callback is the resolved NextAuth origin, before Google authorization starts. The Production build now pins `NEXTAUTH_URL` to `https://getsavdown.com` through Next.js configuration so a stale Vercel auth URL cannot select the old domain in the built application. Update Vercel variables too, for consistency with server helpers and public site URL consumers. This is not a post-login redirect workaround.

## Vercel changes to make manually

Use the existing `social-media-downloader` project. Review all environment and branch-specific overrides; their current remote values have not been verified.

| Variable | Production | Preview |
| --- | --- | --- |
| `NEXTAUTH_URL` | Set `https://getsavdown.com` (no `/api/auth` suffix for this standard route). | Replace any inherited old production URL with the stable Preview hostname that actually starts authentication, e.g. `https://<stable-preview-host>`. Register its exact callback with Google. |
| `NEXT_PUBLIC_SITE_URL` | Set `https://getsavdown.com`. | Set to the same stable Preview origin when reviewing authentication there. |
| `NEXTAUTH_URL_INTERNAL` | Leave unset unless a separate internal origin is intentionally needed; remove any stale old-domain override. | Likewise; never point at Production for Preview authentication. |
| `AUTH_URL` | This version does not consume it. Remove a stale old-domain value, or align it to the canonical URL if retained for other tooling. | Remove a stale old-domain value, or align it to the Preview origin if retained. |
| `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL` | Keep Vercel-managed values. They are not the canonical authentication setting. | Keep Vercel-managed values. |
| `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Preserve existing values. | Preserve existing values; use the matching OAuth client's allowed Preview callback. |

Do not globally assign the Production `NEXTAUTH_URL` to Preview: the PKCE/state cookies set on Preview will not accompany a callback to `getsavdown.com`. For ephemeral previews without a registered stable hostname, perform Google sign-in review on Production instead. No cross-domain session handoff has been introduced.

In Project Settings > Domains, ensure both `getsavdown.com` and `www.getsavdown.com` belong to the Production deployment, with valid DNS and certificates. Configure `www` to redirect to `https://getsavdown.com`; the repository also supplies a host-specific permanent redirect preserving paths and queries. Authentication should start after that redirect, on the root domain.

Apply Google changes below before deploying. Create a fresh Production deployment after the environment changes: Next.js embeds configured environment values at build time.

## Google Auth Platform changes to make manually

In the project containing the **existing OAuth client** matching `GOOGLE_CLIENT_ID`:

1. Branding: add authorized domain `getsavdown.com` (no scheme or path). Verify domain ownership in Google Search Console if required. Set app name to `SavDown`, homepage to `https://getsavdown.com`, privacy policy to `https://getsavdown.com/privacy`, and terms to `https://getsavdown.com/terms`.
2. Clients > existing Web application client: add authorized JavaScript origin `https://getsavdown.com` (no path). NextAuth uses server OAuth rather than a browser Google SDK; this origin does not replace the required callback.
3. Add the exact authorized redirect URI `https://getsavdown.com/api/auth/callback/google`, without a trailing slash. Retain `https://social-media-downloader-sav-down.vercel.app/api/auth/callback/google` temporarily as a rollback fallback. Retain other existing provider/client settings. Do not create a new client or rotate credentials.
4. Add the separate stable Preview origin/callback only if Google sign-in is needed there. A permitted URI does not make it primary; NextAuth selects the URI for each request.
5. If the chooser still displays the old domain after the actual authorization request uses the new callback, inspect **published** Branding, not just the saved draft, in that same Google project. Complete brand verification and publish the updated branding when required. Google states that unverified branding displays the application domain instead of the app name. A code change alone cannot publish Google branding.

References: [NextAuth v4 options](https://next-auth.js.org/configuration/options), [NextAuth deployment guidance](https://next-auth.js.org/deployment), [Google OAuth web server flow and URI requirements](https://developers.google.com/identity/protocols/oauth2/web-server), [Google branding and verification](https://support.google.com/cloud/answer/15549049).

## Sessions and existing accounts

The Google provider, existing client credentials, JWT strategy, secret, database account mapping, and user records are unchanged. NextAuth retains its default secure, HttpOnly, SameSite=Lax, host-only cookies on HTTPS. Its default redirect callback allows relative and same-origin destinations. Existing workspace `callbackUrl` paths and logout paths remain unchanged.

Cookies from the old Vercel host cannot transfer to the new domain; those visitors may need to sign in again. This does not recreate their account. The retained Google callback is a rollback allowance, not a shared session mechanism: an old deployment must initiate and finish OAuth on its own origin to use it.

## Live Testing Checklist

No local tests, build, lint, development server, or local authentication procedures were run. Source and final diff review only; the issue is **not confirmed fixed** until live review.

- [ ] Google account chooser identifies SavDown using the new domain.
- [ ] The Google authorization request has `redirect_uri=https://getsavdown.com/api/auth/callback/google`, and the callback returns to `getsavdown.com`.
- [ ] Successful sign-in opens the requested workspace and existing account.
- [ ] Refresh preserves the authenticated session.
- [ ] Logout and subsequent sign-in work correctly.
- [ ] `www.getsavdown.com` redirects consistently to the canonical root, including `/login?callbackUrl=%2Fworkspace`, before sign-in starts.
- [ ] If Preview OAuth is configured, it begins and finishes on its own registered stable hostname.
