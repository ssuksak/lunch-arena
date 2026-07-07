-- Source: migrations/20260422_security_hardening.sql

-- Statement: 7 of 8

-- user_school_changes FK 인덱스
create index if not exists idx_user_school_changes_from_school
  on public.user_school_changes(from_school_id);
