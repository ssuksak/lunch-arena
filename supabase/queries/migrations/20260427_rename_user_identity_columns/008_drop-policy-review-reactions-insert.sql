-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 8 of 24

drop policy if exists review_reactions_insert on public.review_reactions;
