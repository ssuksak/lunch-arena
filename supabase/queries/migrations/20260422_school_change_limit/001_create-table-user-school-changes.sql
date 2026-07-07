-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 1 of 15

-- Migration: 학교 변경 횟수 제한 (30일 롤링 3회)
-- 작성: 2026-04-22
-- 목적: 사용자가 학교를 무한 변경하지 못하도록 제한. 첫 등록은 자유.

-- 1. 변경 이력 테이블
create table if not exists public.user_school_changes (
  id bigserial primary key,
  user_hash text not null,
  from_school_id bigint references public.schools(id) on delete set null,
  to_school_id bigint references public.schools(id) on delete set null,
  changed_at timestamptz default now()
);
