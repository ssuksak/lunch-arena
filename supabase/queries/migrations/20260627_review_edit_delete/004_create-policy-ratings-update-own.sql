-- Source: migrations/20260627_review_edit_delete.sql

-- Statement: 4 of 6

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
