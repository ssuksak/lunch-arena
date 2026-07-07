-- Source: migrations/20260421_create_user_schools.sql

-- Statement: 9 of 16

create policy user_schools_read on public.user_schools
  for select to anon, authenticated using (true);
