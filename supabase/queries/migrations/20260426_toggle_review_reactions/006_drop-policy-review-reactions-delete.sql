-- Source: migrations/20260426_toggle_review_reactions.sql

-- Statement: 6 of 9

drop policy if exists review_reactions_delete on public.review_reactions;
