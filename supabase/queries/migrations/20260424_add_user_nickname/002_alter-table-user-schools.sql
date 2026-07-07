-- Source: migrations/20260424_add_user_nickname.sql

-- Statement: 2 of 4

alter table public.user_schools
  drop constraint if exists user_schools_nickname_length_check;
