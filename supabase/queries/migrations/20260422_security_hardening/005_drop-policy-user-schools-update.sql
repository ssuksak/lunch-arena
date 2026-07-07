-- Source: migrations/20260422_security_hardening.sql

-- Statement: 5 of 8

-- UPDATE 정책: user_hash 변경 금지
drop policy if exists user_schools_update on public.user_schools;
