-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 13 of 15

grant execute on function public.get_school_change_status(text) to anon, authenticated;
