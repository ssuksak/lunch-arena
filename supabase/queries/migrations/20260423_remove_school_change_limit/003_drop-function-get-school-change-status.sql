-- Source: migrations/20260423_remove_school_change_limit.sql

-- Statement: 3 of 5

-- The client no longer needs public change-count reads when there is no limit.
drop function if exists public.get_school_change_status(text);
