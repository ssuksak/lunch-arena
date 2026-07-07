-- Source: migrations/20260422_battle_find_opponent.sql

-- Statement: 2 of 3

grant execute on function public.find_battle_opponents(double precision, double precision, text, bigint, date, int) to anon, authenticated;
