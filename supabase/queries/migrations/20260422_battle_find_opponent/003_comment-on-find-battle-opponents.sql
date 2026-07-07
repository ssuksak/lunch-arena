-- Source: migrations/20260422_battle_find_opponent.sql

-- Statement: 3 of 3

comment on function public.find_battle_opponents is '내 학교 위치 기준 근처 동일 학교급 + 당일 급식 있는 학교 목록 (거리순)';
