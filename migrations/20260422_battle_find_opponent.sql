-- Migration: 배틀 상대 학교 찾기 RPC
-- 작성: 2026-04-22
-- 목적: 내 학교 위치 기준 근처 + 동일 학교급 + 당일 급식 있는 학교 목록 (거리순)

create or replace function public.find_battle_opponents(
  p_my_lat double precision,
  p_my_lng double precision,
  p_my_type text,       -- '초' | '중' | '고'
  p_my_id bigint,
  p_date date,
  p_limit int default 20
)
returns table(
  school_id bigint,
  school_name text,
  school_type text,
  address text,
  atpt_code text,
  school_code text,
  lat double precision,
  lng double precision,
  distance_km double precision,
  meal_id bigint,
  auto_score int,
  auto_rank text,
  menu jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    s.id as school_id,
    s.name as school_name,
    s.type as school_type,
    s.address,
    s.atpt_code,
    s.school_code,
    s.lat, s.lng,
    (6371 * acos(
      greatest(-1.0, least(1.0,
        cos(radians(p_my_lat)) * cos(radians(s.lat))
        * cos(radians(s.lng) - radians(p_my_lng))
        + sin(radians(p_my_lat)) * sin(radians(s.lat))
      ))
    ))::double precision as distance_km,
    m.id as meal_id,
    m.auto_score,
    m.auto_rank,
    m.menu
  from public.schools s
  inner join public.meals m
    on m.school_id = s.id and m.meal_date = p_date
  where s.id <> p_my_id
    and s.lat is not null and s.lng is not null
    and (
      (p_my_type = '초' and s.type like '%초등%')
      or (p_my_type = '중' and s.type like '%중학%')
      or (p_my_type = '고' and s.type like '%고등%')
    )
  order by distance_km asc
  limit greatest(1, coalesce(p_limit, 20));
$$;

grant execute on function public.find_battle_opponents(double precision, double precision, text, bigint, date, int) to anon, authenticated;

comment on function public.find_battle_opponents is '내 학교 위치 기준 근처 동일 학교급 + 당일 급식 있는 학교 목록 (거리순)';
