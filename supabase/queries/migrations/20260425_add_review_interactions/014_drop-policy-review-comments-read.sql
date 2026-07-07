-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 14 of 20

drop policy if exists review_comments_read on public.review_comments;
