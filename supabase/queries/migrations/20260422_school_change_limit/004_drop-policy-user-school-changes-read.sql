-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 4 of 15

-- 읽기만 익명 허용 (본인 카운트 조회용). 쓰기는 트리거가 하므로 정책 없음
drop policy if exists user_school_changes_read on public.user_school_changes;
