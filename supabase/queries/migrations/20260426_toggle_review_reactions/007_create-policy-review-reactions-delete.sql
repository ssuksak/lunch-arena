-- Source: migrations/20260426_toggle_review_reactions.sql

-- Statement: 7 of 9

create policy review_reactions_delete on public.review_reactions
  for delete to anon, authenticated
  using (
    cancel_token_hash is not null
    and cancel_token_hash = nullif((nullif(current_setting('request.headers', true), '')::json ->> 'x-reaction-cancel-token-hash'), '')
  );
