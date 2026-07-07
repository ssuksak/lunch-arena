-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 9 of 24

create policy review_reactions_insert on public.review_reactions
  for insert to anon, authenticated
  with check (user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and reaction in ('like', 'dislike'));
