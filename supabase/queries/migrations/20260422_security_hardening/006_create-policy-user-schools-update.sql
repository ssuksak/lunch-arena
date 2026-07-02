-- Source: migrations/20260422_security_hardening.sql

-- Statement: 6 of 8

create policy user_schools_update on public.user_schools
  for update to anon, authenticated
  using (true)
  with check (user_hash = user_schools.user_hash);
