-- Source: migrations/20260427_rename_user_identity_columns.sql

-- Statement: 13 of 24

revoke all on function public.log_user_school_change() from public, anon, authenticated;
