-- Migration: 사용자 닉네임 저장
-- 작성: 2026-04-24
-- 목적: 앱 접속 시 자동 부여되는 랜덤 닉네임을 사용자 식별키와 함께 저장

alter table public.user_schools
  add column if not exists nickname text;

alter table public.user_schools
  drop constraint if exists user_schools_nickname_length_check;
alter table public.user_schools
  add constraint user_schools_nickname_length_check
  check (nickname is null or char_length(nickname) between 2 and 12);

comment on column public.user_schools.nickname is '사용자 표시 닉네임. 앱에서 자동 생성되며 사용자가 변경 가능';
