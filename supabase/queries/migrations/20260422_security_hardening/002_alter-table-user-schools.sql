-- Source: migrations/20260422_security_hardening.sql

-- Statement: 2 of 8

alter table public.user_schools
  add constraint user_hash_format_check
  check (user_hash ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$');
