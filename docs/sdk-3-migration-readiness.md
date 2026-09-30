# SDK 3 migration readiness (2026-09-30)

## Local candidate

- Live Apps in Toss bundle remains SDK 2.4.7, version `20260923-16`.
- Local source and build use `@apps-in-toss/web-framework` 3.6.0.
- `apps-in-toss.config.ts` replaces `granite.config.ts`; `package.json` builds `dist` before `ait build`.
- `npm run build` passed and created `lunch-arena.ait`. After explicit user approval, the artifact was uploaded and console compilation completed. No review or live release was requested.
- The static browser preview loaded without console errors. It uses the browser `fp_` identity fallback, so it cannot verify the Toss `toss_` identity.

## Data continuity

The [SDK 3.x guide](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x) says SDK 3.0.0 through 3.1.0 used a different Origin, but SDK 3.1.1 and later use the SDK 2.x Origin. The [server API guide](https://developers-apps-in-toss.toss.im/documentation/integration/server-api) lists `https://lunch-arena.apps.tossmini.com` for production and `https://lunch-arena.private-apps.tossmini.com` for QR tests. This app is moving directly from live 2.4.7 to 3.6.0, so an Origin storage copy is not expected. Do not add `Migration.getOriginStorage()` solely based on the older handoff note; use it only if a real device test finds an Origin transition or a user previously ran a 3.0.0-3.1.0 bundle.

The app uses `getAnonymousKey()` for `toss_<hash>`. The [user key documentation](https://developers-apps-in-toss.toss.im/documentation/common/authentication/hash-key) says the same user and mini-app keep the same hash. Verify this on a device against an existing account before release. Server profile and school membership are the source of truth; local storage still caches school, nickname, review markers, reaction tokens, and battle votes.

## Release gates

1. Test the candidate in the Apps in Toss QR environment with an existing user who has a school, nickname, review, reaction, and battle vote. Confirm the same server profile and visible local states after upgrade.
2. Test a new user, school setup, review creation and edit/delete, reaction, battle vote, sharing, and photos on both Android and iOS where available.
3. Confirm requests to Supabase REST and Edge Functions from the QR Origin. The checked-in Edge Functions currently return wildcard CORS headers; verify deployed functions and REST behavior on device.
4. Confirm the bundle's SDK version and the live version in the console before requesting review. Keep the SDK 2.4.7 live bundle until QR checks pass.
5. Treat release as one-way: the [SDK 3.x guide](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x) says a released SDK 3.x bundle cannot roll back to SDK 2.x.

This static HTML project uses `http-server`, without a supported Vite/Next/Rspack/Webpack devtools integration. Browser preview checks rendering and fallback behavior; Toss SDK behavior needs QR device testing.

## Verified candidate

- Candidate deployment ID: `01a0f140-4828-7953-9ea6-ecc918c75ce0`.
- Console version: `20260930-18`, CREATED, SDK 3.6.0, not deployed. Self-test push sent; `isTested=true` means test environment preparation only, not completed phone QA.
- Artifact SHA-256: `d4ca31fbe439547b560c1f2ce6447240dc8524fb192123feee40222e9ae3e87e`.
- Earlier `20260930-17` remains an unused PREPARE registration. Its upload URL returned HTTP 403 after approval; rebuilding unchanged source generated the new candidate above, which uploaded with HTTP 200.
- Live version rechecked on 2026-09-30: `20260923-16`, SDK 2.4.7, deployed and approved.

## User continuity safeguards

- Only a valid `{ type: 'HASH', hash }` SDK response becomes a Toss identity. Error strings no longer become shared user keys.
- Toss Origins, the native WebView bridge, and the SDK environment are checked before allowing browser fallback. Failed Toss identification never creates an `fp_` user or clears the school cache.
- Concurrent identity requests share one lookup. Transient errors get one retry; each attempt has a five-second timeout. A failed attempt can be retried on the same page.
- User-scoped Edge requests must match the resolved Toss identity before transmission.
- A failed profile request can display the cached school but cannot silently write stale school data back to the server.
- Startup displays a retry action for identification failures. No schema changes or data migration were performed.

## Verification results

| Check | Result | Scope |
| --- | --- | --- |
| `npm run test:sdk3` | 17 passed | Existing keys/cache, malformed results, thrown errors, hangs, retry/recovery, concurrency, write guard, server profile precedence |
| `scripts/verify-sdk3-browser.js` through Playwright MCP | 8 passed | Same-Origin SDK 2 source to SDK 3 source transition, existing/new user, empty storage, SDK retry/error UI, profile failure, ordinary browser |
| `node scripts/verify-sdk3-network.mjs` | 48 passed | 11 OPTIONS preflights plus one public REST GET for each of 4 Toss Origins |
| `node scripts/verify-sdk3-artifact.mjs` | Passed | Official AIT reader, SDK/app/deployment metadata, embedded source matches working files |
| `npm audit --omit=dev --json` | 0 advisories | Production dependency tree only |
| JavaScript syntax and `git diff --check` | Passed | Static checks |
| Actual phone SDK 3 execution | Pending | Candidate uploaded; requires an existing user's phone |
| Real review/photo/reaction/vote writes under SDK 3 | Pending | Requires controlled phone test; automated browser scenarios intercept backend requests |

The browser tests stub the native key API and backend responses. They verify application behavior, not the Toss native implementation. The same-Origin upgrade test uses the Git HEAD SDK 2 source and the working SDK 3 source in one browser context, without clearing local storage. QR uses `private-apps.tossmini.com`, a separate storage Origin from the live app, so absence of live local markers in QR alone does not prove production data loss. Compare the same server user and records on the phone; production localStorage continuity is supported by the official Origin guarantee and the simulated upgrade test, not yet observed on a released SDK 3 build.

To rerun browser verification, export Git HEAD's `index.html`, `community.js`, `community.css`, `ait-bridge.js`, `lucide.min.js`, and icons into `.cache/sdk3-verification/sdk2`, serve that directory on port 5174, and serve candidate `dist` on port 5173. Pass the absolute path of `scripts/verify-sdk3-browser.js` to Playwright MCP's `browser_run_code_unsafe`.
