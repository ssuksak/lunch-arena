-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 10 of 24

drop policy if exists review_comments_insert on public.review_comments;
