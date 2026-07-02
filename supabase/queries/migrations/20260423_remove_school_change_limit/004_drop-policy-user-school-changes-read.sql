-- Source: migrations/20260423_remove_school_change_limit.sql

-- Statement: 4 of 5

drop policy if exists user_school_changes_read on public.user_school_changes;
