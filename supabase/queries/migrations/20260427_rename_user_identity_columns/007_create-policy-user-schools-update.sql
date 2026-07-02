-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 7 of 24

create policy user_schools_update on public.user_schools
  for update to anon, authenticated
  using (user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$')
  with check (user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and source in ('toss', 'fp'));
