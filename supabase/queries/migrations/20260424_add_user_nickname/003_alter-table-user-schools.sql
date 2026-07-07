-- Source: migrations/20260424_add_user_nickname.sql

-- Statement: 3 of 4

alter table public.user_schools
  add constraint user_schools_nickname_length_check
  check (nickname is null or char_length(nickname) between 2 and 12);
