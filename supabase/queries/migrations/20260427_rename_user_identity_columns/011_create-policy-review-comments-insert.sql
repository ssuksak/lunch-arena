-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 11 of 24

create policy review_comments_insert on public.review_comments
  for insert to anon, authenticated
  with check (user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$' and char_length(comment) between 1 and 300);
