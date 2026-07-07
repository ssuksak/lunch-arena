-- Source: migrations/20260626_fix_meal_batch_total_count.sql

-- Statement: 2 of 2

revoke all on function public.advance_meal_batch() from public, anon, authenticated;
