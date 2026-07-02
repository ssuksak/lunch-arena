-- Source: migrations/20260426_toggle_review_reactions.sql

-- Statement: 2 of 9

alter table public.review_reactions
  drop constraint if exists review_reactions_cancel_token_hash_check;
