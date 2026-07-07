-- Source: migrations/20260421_create_user_schools.sql

-- Statement: 2 of 16

create index if not exists idx_user_schools_school_id on public.user_schools(school_id);
