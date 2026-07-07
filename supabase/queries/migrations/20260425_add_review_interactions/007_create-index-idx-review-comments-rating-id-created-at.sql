-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 7 of 20

create index if not exists idx_review_comments_rating_id_created_at on public.review_comments(rating_id, created_at);
