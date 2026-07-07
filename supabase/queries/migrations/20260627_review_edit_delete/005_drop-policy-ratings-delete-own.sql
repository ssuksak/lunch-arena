-- Source: migrations/20260627_review_edit_delete.sql

-- Statement: 5 of 6

drop policy if exists ratings_delete_own on public.ratings;
