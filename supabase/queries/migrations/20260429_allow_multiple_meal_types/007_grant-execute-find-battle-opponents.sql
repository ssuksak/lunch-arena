-- Source: migrations/20260429_allow_multiple_meal_types.sql

-- Statement: 7 of 9

grant execute on function public.find_battle_opponents(double precision, double precision, text, bigint, date, int) to anon, authenticated;
