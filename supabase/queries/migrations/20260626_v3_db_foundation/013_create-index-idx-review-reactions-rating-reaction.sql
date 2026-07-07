-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 13 of 49

create index if not exists idx_review_reactions_rating_reaction
  on public.review_reactions(rating_id, reaction);
