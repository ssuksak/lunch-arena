# 급식 낙서장 Design QA

Source: `/Users/jinwoong/.codex/generated_images/01a12f13-5565-7da3-ae77-01638ea021ee/exec-88e65b1c-73a0-41cb-9296-e12daeef8adb.png`
Implementation: `.qa/playground-mobile.png`
Full comparison: `.qa/playground-comparison.png`
Focused poem/reaction comparison: `.qa/playground-detail-comparison.png`
Viewport: 390 × 844 CSS pixels, implementation 390 × 844 pixels (1×).
Source: 853 × 1844 pixels, normalized to 390 × 844 for comparison.
State: playground, example poem, funny selected. Source latest tab/count28;
implementation popular tab/count29 after interaction test. These state differences
are intentional, not visual drift. An additional locally written test poem is below.

## Findings and comparison history

1. P1: initial inherited sans text did not reproduce notebook lettering.
   Fixed with bundled Gaegu regular/bold, larger title/initials/poem text.
2. P2: first mobile capture had reactions partially under the fixed bottom nav.
   Fixed with compact hero spacing; final 390px capture shows all three controls.
3. P2: poem was plain white and lost the notebook theme.
   Added generated poem paper asset; second capture had excessive paper contrast.
   Reduced texture opacity over a white card and added syllable surface highlights.
   Final full and focused comparisons were opened together and reviewed.

## Required surfaces

- Typography: actual selectable Korean text; bundled handwriting face for heading,
  prompt and lines, existing app sans for controls. Readable wrapping at 320px.
- Spacing: same header/prompt/write/sort/poem/reactions/bottom-nav hierarchy.
  No top navigation row. Hero is intentionally more compact for the explicit
  local-test notice. Bottom navigation retains the repository's shell.
- Colors: existing gray/white/orange tokens. Selected reaction has orange outline
  and pale orange fill. Text labels supplement facial icons.
- Assets: generated notebook and poem-paper rasters bundled locally; existing
  repository logo retained. Published icon library used for standard controls.
- Copy: selected title, prompt and poem preserved. No comments or reply controls.
  Sample content and local-only persistence are explicitly identified.

## Interaction checks

Browser: write three lines → publish → newest first; new content persists on reload.
Reaction: funny select → like switch → like cancel; no double counting.
Popular sort puts the example with more funny reactions first.
Direct playground URL opens without waiting for a school/API lookup.
390×844 and 320×720 checked; no horizontal overflow. Small screens scroll to controls.
Browser error/warning logs were empty at final inspection.
Node tests cover line limits/prefix/newline, switch/cancel, persistence, duplicate
content prevention, sort and storage errors. Static build passed.

## Follow-up polish

P3: artwork and handwriting are close in direction, not an exact raster reproduction.
The prototype keeps the real app logo, replaces the sample rice avatar with a
library chef-hat icon, and omits nonfunctional decorative slogans/menu dots.
This is a test feature; live DB/API writes and Toss device acceptance are not verified.

final result: passed

## 2026-10-13: Current leader + latest feed revision

User-directed layout change: remove sorting tabs; show current rank-one works in a
separate section above a permanently chronological feed. The notebook assets,
fonts, reactions and fixed bottom navigation are preserved.

Evidence: `.qa/playground-leader.png`, 390×844. Browser verified the separate
heading and leader card, latest feed ordering (new test work before older example),
and equal funny count/selection in both copies of the same poem after a reaction.
Console error/warning logs were empty. All controls remain reachable by scrolling.
Node tests cover tied leaders, zero-vote/no-leader state, ranking change after
reaction change, and independence of chronological feed ordering.
The fixed-design DB proposal no longer contains theme_key.
No actionable P0/P1/P2 findings for this revision.

final result: passed

## Winner badge revision

User requested a visible winner mark on the work itself. Added library crown icon,
orange current-rank badge (joint-rank label for ties), stronger border and subtle
shadow on the spotlight card. Latest-feed copy also carries its rank badge.
Evidence: `.qa/playground-winner-badge.png`, 390×844; browser 320px check confirms
badge remains inside the card. No console errors/warnings. Static build and diff
checks passed. Fixed notebook art and content hierarchy retained.

final result: passed

## Latest/popular sorting and pagination revision

User-directed change: reintroduce latest/popular selector below the independent
current-leader area. Latest is the entry default; popular orders by funny count,
then timestamp and ID for stable ties. Render ten works initially; load-more adds
ten and hides once the final batch is visible. Changing sort or submitting a new
work resets to the first batch (submission returns to latest).

Evidence: `.qa/playground-sorting.png`, 390×844. Browser verified latest vs popular
ordering using existing local works; crown and independent leader remain intact.
No console warnings/errors. Node fixtures verify 10/20/25 pagination, exact/empty
pages, tie ordering, immutable source and a winner outside the visible latest page.
Static build and whitespace checks passed. No actionable P0/P1/P2 findings.
Pagination currently limits rendered local demo records. Real DB cursor pagination
and global popularity queries remain part of the future live adapter.

final result: passed

## Supabase live integration

Source art and fixed notebook layout retained. Current DB word is 갈비탕, dynamic
composer prefixes match 갈/비/탕; writing deadline is shown in Asia/Seoul.
Evidence: `.qa/playground-live.png`, 390×844. Empty works/leader are expected actual
DB state (no local demo records copied). Read API, sorting request, dynamic composer
and browser warning/error checks passed. Form submission is connected to the API,
but public end-to-end test insertion awaits explicit approval after auto-review
rejected an earlier persistent test without cleanup. DB rollback write tests and
isolated Edge identity/routing tests passed. This note does not claim a public
API insertion was executed. Static build passed.

final result: passed

## Approved live write test and duplicate brand removal

User approved two test anonymous users and one poem. Actual Edge API verified
registration/idempotency, reaction select/concurrent switch/cancel, self-vote
rejection, canonical ownership and exclusion of private author UUID from feed.
Finally hid the exact owned request; latest/popular/leader results exclude it.
DB confirmed status=deleted, all counts zero, zero reaction rows and zero visible
works. Approved session users and soft-deleted work remain as disclosed.

User annotation requested removal of the in-page 오늘급식 logo/name because Toss
supplies common branded navigation. Removed only pg-brand markup. Notebook hero,
weekly word and all other content remain. Browser screenshot: `.qa/playground-live-no-brand.png`.

final result: passed
