-- Source: migrations/20260425_add_review_interactions.sql

-- Statement: 3 of 20

alter table public.ratings
  add constraint ratings_nickname_length_check
  check (nickname is null or char_length(nickname) between 2 and 12);
