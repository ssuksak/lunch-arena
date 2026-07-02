-- Source: migrations/20260422_security_hardening.sql

-- Statement: 3 of 8

-- INSERT 정책: 형식 검증 + source 화이트리스트
drop policy if exists user_schools_insert on public.user_schools;
