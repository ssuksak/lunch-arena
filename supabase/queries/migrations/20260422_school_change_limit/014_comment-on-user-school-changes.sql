-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 14 of 15

comment on table public.user_school_changes is '학교 변경 이력 (30일 롤링 3회 제한)';
