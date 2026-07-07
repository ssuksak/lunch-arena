# LA Table Map

Use this table map when checking Supabase after user testing.

## User Identity And School Selection

Primary tables:

- `la_users`
- `la_user_keys`
- `la_user_profiles`
- `la_user_school_memberships`
- `la_activity_events`

Feature mapping:

- School save/change writes the current school to `la_user_school_memberships`.
- The selected school shown for the user is also reflected in `la_user_profiles.selected_school_id`.
- The browser identity is stored as a `user_key`, usually `fp_*` in local browser testing.
- School-change events are recorded in `la_activity_events` with `event_type = 'school_changed'`.

Do not use:

- Legacy `user_schools` or other non-LA profile tables for the cloned test frontend.

## Schools And Meals

Primary tables:

- `la_schools`
- `la_meals`

Feature mapping:

- School search reads `la_schools`.
- Meal sync writes/updates `la_meals`.
- Ranking and battle candidate views read `la_meals` plus joined `la_schools`.

Note:

- `la_meals` can contain many schools because sync/ranking/battle candidate flows fetch more than the single school the user is currently testing.
- Seeing many rows in `la_meals` is expected.

Do not use:

- Legacy `schools`
- Legacy `meals`

## Real-Time Meal Talk / Reviews

Primary tables:

- `la_reviews`
- `la_review_comments`
- `la_review_reactions`
- `la_review_photos`
- `la_activity_events`

Feature mapping:

- `실시간 급식톡` and `우리학교 급식톡` are review/feed UI over `la_reviews`.
- Review create uses `submit-review`.
- Review edit uses `update-review`.
- Review delete uses `delete-review`.
- Review comments use `create-review-comment`.
- Review like/dislike uses `react-review`.
- Review photo metadata is in `la_review_photos`; binary image objects are in Cloudflare R2.

Do not use:

- Legacy `ratings`
- Legacy `review_comments`
- Legacy `review_reactions`

## Battles

Primary tables:

- `la_battles`
- `la_battle_votes`

Feature mapping:

- Battle create uses `create-battle`.
- Battle opponent replacement uses `replace-battle-opponent`.
- Battle vote uses `vote-battle`.
- Candidate lookup uses RPC `la_find_battle_opponents`.

Do not use:

- Legacy `battles`
- Legacy `battle_votes`

## Community

Primary tables:

- `la_community_posts`
- `la_community_comments`
- `la_community_reactions`
- `la_moderation_reports`
- `la_feed_items`
- `la_activity_events`

Feature mapping:

- Community post create uses `create-community-post`.
- Community comment create uses `create-community-comment`.
- Community like toggle uses `react-community`.
- Community post/comment edit uses `update-community-content`.
- Community post/comment delete uses `delete-community-content`.
- Report flow uses `report-community-content`.
- Feed projection is stored in `la_feed_items`.

Important distinction:

- Community tables are not the same as `실시간 급식톡`.
- In the current frontend, `실시간 급식톡` is review-based and uses `la_reviews`.

## Runtime Read/Write Security

The browser can read selected public `la_*` tables through anon REST, but runtime writes for reviews and battles must go through Edge Functions.

The following tables should be `SELECT` only for `anon` and `authenticated`:

- `la_reviews`
- `la_review_comments`
- `la_review_reactions`
- `la_battles`
- `la_battle_votes`

Hardening migration:

- `supabase/migrations/20260707043000_la_runtime_write_hardening.sql`

