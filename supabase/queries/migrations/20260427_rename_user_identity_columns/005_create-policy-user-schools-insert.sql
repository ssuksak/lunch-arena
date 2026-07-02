-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 5 of 24

create policy user_schools_insert on public.user_schools
  for insert to anon, authenticated
  with check (user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and source in ('toss', 'fp'));
