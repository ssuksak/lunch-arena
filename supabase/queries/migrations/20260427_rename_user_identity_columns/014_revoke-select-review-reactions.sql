-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 14 of 24

revoke select on public.review_reactions from anon, authenticated;
