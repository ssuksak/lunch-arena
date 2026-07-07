-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 2 of 20

alter table public.ratings
  drop constraint if exists ratings_nickname_length_check;
