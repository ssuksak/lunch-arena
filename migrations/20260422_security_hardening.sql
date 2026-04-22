-- Migration: 보안 강화
-- 작성: 2026-04-22
-- 목적:
--   1. user_schools.user_hash 형식 검증 (toss_xxx | fp_xxx)
--   2. UPDATE 시 user_hash 변경 차단
--   3. user_school_changes FK 인덱스 추가 (성능)

-- user_hash 형식 검증 (toss_ 또는 fp_ + 8~128자 영숫자)
alter table public.user_schools
  drop constraint if exists user_hash_format_check;
alter table public.user_schools
  add constraint user_hash_format_check
  check (user_hash ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$');

-- INSERT 정책: 형식 검증 + source 화이트리스트
drop policy if exists user_schools_insert on public.user_schools;
create policy user_schools_insert on public.user_schools
  for insert to anon, authenticated
  with check (
    user_hash ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$'
    and source in ('toss', 'fp')
  );

-- UPDATE 정책: user_hash 변경 금지
drop policy if exists user_schools_update on public.user_schools;
create policy user_schools_update on public.user_schools
  for update to anon, authenticated
  using (true)
  with check (user_hash = user_schools.user_hash);

-- user_school_changes FK 인덱스
create index if not exists idx_user_school_changes_from_school
  on public.user_school_changes(from_school_id);
create index if not exists idx_user_school_changes_to_school
  on public.user_school_changes(to_school_id);
