# Daily Review Limit

- New reviews: 3 per canonical `la_users.id` per Asia/Seoul calendar day.
- Meal dates and schools do not partition the allowance. Linked user keys share it.
- Edits, comments, reactions and battles do not consume the allowance.
- Deleting a review does not restore allowance. Existing reviews remain untouched.
- The service-role-only `la_submit_review_limited` RPC locks the user row and
  inserts the review and updates `metadata.review_daily_quota` in one transaction.
  Existing reviews written today are counted when seeding the allowance.
- School, representative-menu and individual rankings recognize at most the
  first three reviews per user and Korea calendar day. Comments and reactions
  remain unrestricted and continue to contribute normally.
- No tables or columns were added. Public table write grants remain revoked.
- A failed database insert rolls back quota use. A later activity/photo failure
  that compensates by deleting an already committed review still consumes its slot.
- Existing identity is based on supplied user keys. This is not protection against
  creating entirely new identities; verified server-side identity is separate work.
- `submit-review` returns HTTP 429 / `REVIEW_DAILY_LIMIT_REACHED` when full.
  The frontend retains the draft and shows a Korean notice. Successful responses
  include `daily_remaining` and `daily_reset_at`.

## Verification

`node scripts/verify-review-daily-limit.mjs` uses a unique test identity, submits
six concurrent requests, checks three accepted / three limited, verifies edits,
four comments and four reaction calls after the limit, verifies no replenishment
after deletion, and confirms anonymous RPC access is denied. Test reviews are removed.

`scripts/verify-review-daily-limit.sql` runs in a rolled-back transaction and checks
previous-day counter reset, shared-key allowance and Korea midnight boundaries.

## Rollback

Restore the previous `submit-review` Edge Function insert path. The unused RPC
and metadata may remain without affecting old behavior. Do not delete user reviews.
