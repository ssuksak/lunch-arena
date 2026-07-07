-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 7 of 15

drop trigger if exists trg_log_user_school_change on public.user_schools;
