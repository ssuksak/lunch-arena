# Runtime Flows

This is the frontend-to-backend map for the cloned test frontend.

## Frontend Entry Points

Main frontend:

- `index.html`

Test copy:

- `D:\Data\43_LA\frontend\index.html`

Keep them in sync before asking the user to test.

## Shared Frontend Helpers

Important helpers in `index.html`:

- `sb(path, opts)` - Supabase REST read helper, now uses `cache: 'no-store'`.
- `edge(fn, body)` - Edge Function POST helper.
- `getInteractionUserKey()` - returns `window.USER.id` or fallback local browser key.
- `refreshVisibleReviews()` - reloads every visible review/feed surface and now awaits all jobs.

Avoid adding direct browser writes with `sb()` to runtime tables. Use Edge Functions for mutations.

## School Save Flow

Frontend action:

- User searches/selects a school and saves it.

Edge Function:

- `set-user-school`

Tables:

- `la_users`
- `la_user_keys`
- `la_user_profiles`
- `la_user_school_memberships`
- `la_activity_events`

What to check in Supabase:

- `la_user_school_memberships.user_key`
- `la_user_school_memberships.school_id`
- `la_user_school_memberships.is_current = true`
- `la_user_profiles.selected_school_id`

## Meal Sync Flow

Frontend action:

- Load recent meal / detail meal / battle meal.

Edge Function:

- `sync-meals`

Tables:

- `la_schools`
- `la_meals`

What to check:

- `la_meals.school_id`
- `la_meals.meal_date`
- `la_meals.menu`
- `la_meals.auto_score`

## Review / Real-Time Meal Talk Flow

Create review:

- Frontend calls `submit-review`.
- Writes `la_reviews`.
- Optional photo metadata writes `la_review_photos`.
- Activity writes `la_activity_events`.

Edit review:

- Frontend calls `update-review`.
- Updates `la_reviews.score`, `la_reviews.comment`, `la_reviews.selected_menu_item`, `la_reviews.nickname`.
- The frontend must read the edit form inside the clicked `.review-item`, not by duplicated global IDs.

Delete review:

- Frontend calls `delete-review`.
- Deletes from `la_reviews`.

Add review comment:

- Frontend calls `create-review-comment`.
- Writes `la_review_comments`.
- The comment panel must be scoped to the clicked `.review-item`.

Like/dislike review:

- Frontend calls `react-review`.
- Inserts/updates/deletes `la_review_reactions`.

Photo upload:

- Frontend calls `create-review-photo-upload` to get an R2 presigned PUT URL.
- Browser uploads to Cloudflare R2.
- Frontend calls `submit-review` with photo metadata.
- Metadata writes to `la_review_photos`.

## Battle Flow

Create battle:

- Frontend calls `create-battle`.
- Writes/upserts `la_battles`.

Change opponent:

- Frontend calls `replace-battle-opponent`.
- Deletes the old no-vote battle and creates/upserts the replacement in `la_battles`.
- If the old battle already has votes, the function returns `BATTLE_ALREADY_VOTED`.

Vote:

- Frontend calls `vote-battle`.
- Inserts `la_battle_votes`.
- Updates `la_battles.vote_a` or `la_battles.vote_b`.

## Community Flow

Create post:

- `create-community-post`
- Writes `la_community_posts`, `la_feed_items`, `la_activity_events`.

Create comment:

- `create-community-comment`
- Writes `la_community_comments`.
- Updates post comment count through RPC.

React:

- `react-community`
- Writes/deletes `la_community_reactions`.
- Updates reaction count through RPC.

Edit:

- `update-community-content`
- Updates `la_community_posts` or `la_community_comments`.
- Updates `la_feed_items` for post edits.

Delete:

- `delete-community-content`
- Soft-deletes post/comment by setting deleted visibility fields.

Report:

- `report-community-content`
- Writes `la_moderation_reports`.
- May auto-hide content based on report threshold.

