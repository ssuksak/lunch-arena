-- Migration: user_schools 테이블 생성
-- 작성: 2026-04-21
-- 목적: 토스 미니앱 사용자 및 브라우저 사용자가 선택한 학교를 서버에 기억

create table if not exists public.user_schools (
  user_hash text primary key,
  source text not null check (source in ('toss', 'fp')),
  school_id bigint references public.schools(id) on delete set null,
  school_name text,
  school_type text,
  atpt_code text,
  school_code text,
  address text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_schools_school_id on public.user_schools(school_id);
create index if not exists idx_user_schools_source on public.user_schools(source);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_schools_updated_at on public.user_schools;
create trigger trg_user_schools_updated_at
  before update on public.user_schools
  for each row execute function public.set_updated_at();

-- RLS 활성화 + 익명 클라이언트 정책
alter table public.user_schools enable row level security;

drop policy if exists user_schools_read on public.user_schools;
create policy user_schools_read on public.user_schools
  for select to anon, authenticated using (true);

drop policy if exists user_schools_insert on public.user_schools;
create policy user_schools_insert on public.user_schools
  for insert to anon, authenticated with check (true);

drop policy if exists user_schools_update on public.user_schools;
create policy user_schools_update on public.user_schools
  for update to anon, authenticated using (true) with check (true);

comment on table public.user_schools is '사용자별 선택 학교 저장 (토스 hash key 또는 fingerprint)';
comment on column public.user_schools.user_hash is 'toss_xxx 또는 fp_xxx 형식';
comment on column public.user_schools.source is 'toss | fp';
