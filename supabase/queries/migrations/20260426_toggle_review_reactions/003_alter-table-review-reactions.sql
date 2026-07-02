-- Source: migrations/20260426_toggle_review_reactions.sql

-- Statement: 3 of 9

alter table public.review_reactions
  add constraint review_reactions_cancel_token_hash_check
  check (cancel_token_hash is null or cancel_token_hash ~ '^[a-f0-9]{64}$');
