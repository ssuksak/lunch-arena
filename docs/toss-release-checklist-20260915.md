# Apps in Toss Release Check — 2026-09-15

Official references:

- https://developers-apps-in-toss.toss.im/checklist/app-nongame
- https://developers-apps-in-toss.toss.im/prepare/console-workspace

The platform's current 19+ availability notice is not an age restriction added
by 오늘급식. The service does not need a separate age gate for this release.

## Verified in source and local browser

- Static CSR build; no SSR.
- HTTPS Supabase API and Edge Function traffic.
- No `eval` or `new Function` use in application source.
- Apps in Toss bridge bundled into the artifact; no runtime SDK CDN import.
- The Kakao map experiment and its runtime SDK loader are excluded from this release.
- Light theme and fixed zoom for ordinary service screens.
- Registered brand name `오늘급식` and the same 600x600 PNG logo are used.
- The score sheet opens only after the score button is tapped, not on entry.
- Review writes use `submit-review`; comments and reactions use Edge Functions.
- New reviews are limited to three per user per Korea calendar day.
- User-entered profanity is masked at display time without changing DB originals.
- Share text uses `intoss://lunch-arena` or a Toss-generated share URL, not a
  GitHub Pages landing URL.
- `anon` and `authenticated` have `SELECT` only on the five LA write tables and
  `la_school_engagement_monthly`; the ranking view uses `security_invoker`.

## Automated verification

- `node scripts/verify-review-daily-limit.mjs`: pass
- `node scripts/verify-la-runtime-crud.mjs`: pass
- `node scripts/verify-la-live.mjs`: pass
- `npm run build`: pass, `.ait` artifact generated
- `npm run build:static`: pass
- Local browser: school meal, review dialog, feed masking and all three ranking
  groups loaded without console errors.

Supabase Security Advisor has no remaining error for the new ranking view.
Existing informational or warning items remain for old operational tables,
legacy `SECURITY DEFINER` RPCs, `la_find_battle_opponents` search path and the
`pg_net` extension location. They are separate backend-hardening work and are
not used for direct review/comment/reaction writes in this release.

## App features to register

| Feature | Description | Scheme |
| --- | --- | --- |
| 우리학교 급식 확인 | 날짜와 끼니를 골라 식단과 자동 급식 점수를 확인 | `intoss://lunch-arena?screen=school` |
| 급식톡 보기 | 전국 또는 우리학교 리뷰, 댓글과 반응을 확인 | `intoss://lunch-arena?screen=feed` |
| 급식 랭킹 보기 | 대표 메뉴, 학교 참여도, 개인 참여도 TOP 5 확인 | `intoss://lunch-arena?screen=ranking` |

Review writing is reached from 우리학교 급식 확인 and does not need a fourth
console feature unless the console requires every CTA to be listed separately.

## Screenshot set

Prepare four portrait PNGs at exactly 636x1048:

1. `01-school-meal.png`: 부산중앙고등학교, lunch/dinner selector, score and menu.
2. `02-write-review.png`: score selector, representative menu and one-line review.
3. `03-community-feed.png`: recent reviews with representative menu and reactions.
4. `04-monthly-rankings.png`: three TOP 5 ranking sections with fair-use notes.

Use actual service data. Avoid loading states, open settings, user-identifying
test fixtures, profanity and the legacy experiment disclosure in the frame.

## Requires Toss device / console verification

- The AIT common navigation bar, close button and first-screen exit behavior.
- Android system back from tabs, dialogs and nested review/comment states.
- `getAnonymousKey` persistence after closing and reopening the miniapp.
- All three registered schemes on a real Toss installation.
- Native share sheet return behavior and generated Toss landing URL.
- Touch latency, network failure, camera denial and memory/network behavior.
- Console logo, Korean display name, customer-support details and screenshot upload.
