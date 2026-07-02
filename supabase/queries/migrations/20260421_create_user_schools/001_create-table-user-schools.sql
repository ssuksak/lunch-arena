-- Source: migrations/20260421_create_user_schools.sql

-- Statement: 1 of 16

-- Migration: user_schools 테이블 생성
-- 작성: 2026-04-21
-- 목적: 토스 미니앱 사용자 및 브라우저 사용자가 선택한 학교를 서버에 기억

create table if not exists public.user_schools (
  user_hash text primary key,
  source text not null check (source in ('toss', 'fp')),
  school_id bigint references public.schools(id) on delete set null,
  school_name text,
  school_type text,
  atpt_code text,
  school_code text,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
