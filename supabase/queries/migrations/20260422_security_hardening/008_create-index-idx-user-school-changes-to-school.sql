-- Source: migrations/20260422_security_hardening.sql

-- Statement: 8 of 8

create index if not exists idx_user_school_changes_to_school
  on public.user_school_changes(to_school_id);
