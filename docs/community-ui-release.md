# Community UI release

2026-09-14. Existing LA runtime retained; community.css and community.js provide the revised presentation and ranking reads. No schema migrations, no new Edge deployments, no legacy writes.

## Features
- Home: selected school meals and latest reviews; old home ranking sections removed.
- Meal types are derived from sync-meals. Menu names/order remain unchanged.
- Rating dialog reuses original score/menu/photo upload/submit code.
- Review ownership, update/delete, dislike, comments, sharing remain in the existing runtime.
- Reactions/comments refresh the affected review, preserving drafts and viewport anchors.
- Monthly top five: representative menu selections, existing school engagement score, authored review/comment counts by runtime user_key.
- Individual rank is not a canonical cross-device person rank; the UI states identifier-based counting. It does not group by nickname or claim likes given/received.
- Reads are paged with a hard cap; failures display retry, not fabricated ranking values.
- Existing automatic-score ranking, map, and battles remain in a collapsed ranking section.

## Verification
- verify-la-live.mjs passed: run 20260914085521.
- verify-la-runtime-crud.mjs passed: run 20260914085605; direct REST insert blocked, legacy write counts zero.
- Initial CRUD run timed out sorting all meals by id on a date filter. Removed unnecessary ordering in test opponent selection; criteria unchanged. Its residual test review 698 was removed via delete-review.
- Protected five tables verified SELECT-only for anon/authenticated.
- Static build and AIT build passed; rebuild final files before upload.
- Browser: real latest reviews, three real ranking blocks, Busan Jungang school search, real lunch/dinner menus verified.
- Existing photo upload pipeline retained; not a new device camera integration. Toss-specific device keyboard/share review remains platform acceptance testing.

## Rollback
Previous origin/master: 9892a2098c7e875390db9407d10311b52de155c3. Revert the release commit and rebuild/upload the previous artifact if needed. Do not roll back database tables for this UI release.
