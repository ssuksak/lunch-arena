-- Source: migrations/20260421_create_user_schools.sql

-- Statement: 11 of 16

create policy user_schools_insert on public.user_schools
  for insert to anon, authenticated with check (true);
