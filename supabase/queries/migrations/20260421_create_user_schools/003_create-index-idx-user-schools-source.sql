-- Source: migrations/20260421_create_user_schools.sql

-- Statement: 3 of 16

create index if not exists idx_user_schools_source on public.user_schools(source);
