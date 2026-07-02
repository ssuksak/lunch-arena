-- Source: migrations/20260429_allow_multiple_meal_types.sql

-- Statement: 8 of 9

comment on function public.find_battle_opponents is '내 학교 위치 기준 근처 동일 학교급 + 당일 중식이 있는 학교 목록 (거리순)';
