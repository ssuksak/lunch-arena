-- Source: migrations/20260422_security_hardening.sql

-- Statement: 4 of 8

create policy user_schools_insert on public.user_schools
  for insert to anon, authenticated
  with check (
    user_hash ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$'
    and source in ('toss', 'fp')
  );
