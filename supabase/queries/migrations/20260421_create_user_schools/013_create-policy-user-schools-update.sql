-- Source: migrations/20260421_create_user_schools.sql

-- Statement: 13 of 16

create policy user_schools_update on public.user_schools
  for update to anon, authenticated using (true) with check (true);
