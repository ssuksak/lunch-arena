-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 15 of 24

grant select (id, rating_id, user_key, nickname, reaction, created_at)
  on public.review_reactions to anon, authenticated;
