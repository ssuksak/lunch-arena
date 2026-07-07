-- Source: migrations/20260627_review_edit_delete.sql

-- Statement: 6 of 6

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
