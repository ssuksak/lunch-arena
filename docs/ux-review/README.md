# UX review branch — 2026-10-07

- Branch: ux-review
- Base: origin/master 74b365f
- Applied all four patches from ogeupsik-handoff.
- Preserved review reply removal from 03f7d2d; removed remaining reply state/counts/styles.
- Preserved reaction buttons, own-review edit/delete, historical-comment exclusion from ranking scores.
- Matched the current live SDK 3.6.0 and updated its build configuration; rebuilt AITBridge including TossAds.
- Preview: http://127.0.0.1:5174/
- Current working tree is in the host temporary folder lunch-arena-ux-review-20261007. Google Drive produced false dirty-file states during git am, so patch application and builds run in the local worktree.

## Validation

- npm run build:static and npm run build: pass.
- Inline JavaScript / community.js syntax and git diff --check: pass.
- Edge headless browser at 390x844 and 320x740: pass.
- Home meal, three navigation tabs, feed expansion/reactions, ranking chip movement, advertising-slot preview and school deep link to home: pass.
- Review reply controls, requests and uncaught JS errors: absent.
- All Supabase requests were intercepted with fixtures: no production database writes.
- Screenshots and machine-readable report are in this directory.

## Before release

- Test actual school setup, review write/edit/delete and reaction endpoints with a controlled test user.
- Check bottom safe area and native navigation on a Toss device.
- Register the new logo in the Toss console before publishing the changed logo.
- Banner group `ait.v2.live.e3151000aef04e90` (콘텐츠 연관 광고, BANNER / ENABLED / no restriction) is connected to home, feed and ranking. Normal web browsers hide native ad slots; ?adSlots=1 remains a placeholder layout preview.
- Tie handling keeps the developer's shared first-place behavior.

No master merge, remote push, GitHub Pages deployment or live release was performed. A Toss test bundle was uploaded for real-device UI and banner verification.


## Real banner integration — 2026-10-07

- Official API: https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/ads/tossads.md
- App IDs: workspace 24563, mini app 29165.
- Test deployment: 01a1144d-99d7-7c82-960c-a653451deee6 / 20261007-20 / SDK 3.6.0.
- AIT upload returned HTTP 200; console compilation requested.
- Home slot: between popular menus and the meal-talk section.
- Feed slot: after the fifth review, or after the final review when fewer exist.
- Ranking slot: below the ranking card rail.
- Only active-page native banners are mounted. Tab changes, feed rerenders and pagehide destroy obsolete instances.
- Initialization, rendering and no-fill failures hide the slot. Unsupported environments hide it too.
- SDK contract tests passed for all three group bindings, one initialization, lifecycle cleanup and failure paths. SDK calls and backend requests were mocked; no real ad impressions occurred in automation.
- Actual Toss-device ad delivery is still pending. Keep using the test bundle until device checks are complete.
