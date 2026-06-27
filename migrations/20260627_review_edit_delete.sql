-- Allow users to edit/delete their own reviews through the public REST API.
-- Ownership is checked against the current Toss/webview user key sent in a
-- request header. This keeps the rollout compatible with the existing anon
-- client until v3 introduces a stronger server-side write path.

revoke update on public.ratings from anon, authenticated;
grant update(score, comment, selected_menu_item, nickname) on public.ratings to anon, authenticated;

drop policy if exists ratings_update_own on public.ratings;
create policy ratings_update_own
  on public.ratings
  for update
  to anon, authenticated
  using (
    user_key is not null
    and user_key = nullif(
      (
        nullif((select current_setting('request.headers', true)), '')::json
        ->> 'x-review-owner-key'
      ),
      ''
    )
  )
  with check (
    user_key is not null
    and user_key = nullif(
      (
        nullif((select current_setting('request.headers', true)), '')::json
        ->> 'x-review-owner-key'
      ),
      ''
    )
    and score between 1 and 5
    and (comment is null or char_length(comment) <= 100)
  );

drop policy if exists ratings_delete_own on public.ratings;
create policy ratings_delete_own
  on public.ratings
  for delete
  to anon, authenticated
  using (
    user_key is not null
    and user_key = nullif(
      (
        nullif((select current_setting('request.headers', true)), '')::json
        ->> 'x-review-owner-key'
      ),
      ''
    )
  );