-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 10 of 15

drop trigger if exists trg_enforce_school_change_limit on public.user_schools;
