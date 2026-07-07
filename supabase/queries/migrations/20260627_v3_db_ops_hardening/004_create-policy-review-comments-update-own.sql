-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 4 of 16

create policy review_comments_update_own
  on public.review_comments
  for update
  to anon, authenticated
  using (
    user_key is not null
    and user_key = nullif(
      (
        nullif((select current_setting('request.headers', true)), '')::json
        ->> 'x-comment-owner-key'
      ),
      ''
    )
  )
  with check (
    user_key is not null
    and user_key = nullif(
      (
        nullif((select current_setting('request.headers', true)), '')::json
        ->> 'x-comment-owner-key'
      ),
      ''
    )
    and char_length(comment) between 1 and 300
  );
