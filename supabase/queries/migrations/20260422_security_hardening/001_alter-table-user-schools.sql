-- Source: migrations/20260422_security_hardening.sql

-- Statement: 1 of 8

-- Migration: 보안 강화
-- 작성: 2026-04-22
-- 목적:
--   1. user_schools.user_hash 형식 검증 (toss_xxx | fp_xxx)
--   2. UPDATE 시 user_hash 변경 차단
--   3. user_school_changes FK 인덱스 추가 (성능)

-- user_hash 형식 검증 (toss_ 또는 fp_ + 8~128자 영숫자)
alter table public.user_schools
  drop constraint if exists user_hash_format_check;
