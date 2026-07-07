-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 10 of 20

drop policy if exists review_reactions_read on public.review_reactions;
