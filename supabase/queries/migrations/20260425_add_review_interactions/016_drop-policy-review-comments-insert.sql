-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 16 of 20

drop policy if exists review_comments_insert on public.review_comments;
