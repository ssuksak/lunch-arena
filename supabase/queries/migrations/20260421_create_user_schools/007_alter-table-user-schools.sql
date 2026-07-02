-- Source: migrations/20260421_create_user_schools.sql

-- Statement: 7 of 16

-- RLS 활성화 + 익명 클라이언트 정책
alter table public.user_schools enable row level security;
