-- Source: migrations/20260424_add_user_nickname.sql

-- Statement: 1 of 4

-- Migration: 사용자 닉네임 저장
-- 작성: 2026-04-24
-- 목적: 앱 접속 시 자동 부여되는 랜덤 닉네임을 사용자 식별키와 함께 저장

alter table public.user_schools
  add column if not exists nickname text;
