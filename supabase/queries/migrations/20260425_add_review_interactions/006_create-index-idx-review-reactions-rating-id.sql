-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 6 of 20

create index if not exists idx_review_reactions_rating_id on public.review_reactions(rating_id);
