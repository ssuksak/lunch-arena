-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 49 of 49

create policy review_reactions_delete
  on public.review_reactions
  for delete
  to anon, authenticated
  using (
    cancel_token_hash is not null
    and cancel_token_hash = nullif(
      (
        nullif((select current_setting('request.headers', true)), '')::json
        ->> 'x-reaction-cancel-token-hash'
      ),
      ''
    )
  );
