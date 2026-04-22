-- Migration: 학교 변경 횟수 제한 (30일 롤링 3회)
-- 작성: 2026-04-22
-- 목적: 사용자가 학교를 무한 변경하지 못하도록 제한. 첫 등록은 자유.

-- 1. 변경 이력 테이블
create table if not exists public.user_school_changes (
  id bigserial primary key,
  user_hash text not null,
  from_school_id bigint references public.schools(id) on delete set null,
  to_school_id bigint references public.schools(id) on delete set null,
  changed_at timestamptz default now()
);

create index if not exists idx_user_school_changes_user_hash_at
  on public.user_school_changes(user_hash, changed_at desc);

alter table public.user_school_changes enable row level security;

-- 읽기만 익명 허용 (본인 카운트 조회용). 쓰기는 트리거가 하므로 정책 없음
drop policy if exists user_school_changes_read on public.user_school_changes;
create policy user_school_changes_read on public.user_school_changes
  for select to anon, authenticated using (true);

-- 2. 변경 발생 시 이력 자동 기록
create or replace function public.log_user_school_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.school_id is distinct from old.school_id then
    insert into public.user_school_changes(user_hash, from_school_id, to_school_id)
    values (new.user_hash, old.school_id, new.school_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_user_school_change on public.user_schools;
create trigger trg_log_user_school_change
  after update on public.user_schools
  for each row execute function public.log_user_school_change();

-- 3. 변경 제한 강제 (BEFORE UPDATE 트리거)
create or replace function public.enforce_school_change_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  change_count int;
begin
  if tg_op = 'UPDATE' and new.school_id is distinct from old.school_id then
    select count(*) into change_count
    from public.user_school_changes
    where user_hash = new.user_hash
      and changed_at > now() - interval '30 days';

    if change_count >= 3 then
      raise exception 'SCHOOL_CHANGE_LIMIT_EXCEEDED: 30일에 최대 3번까지 학교 변경 가능합니다 (현재 %회 변경됨)', change_count
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_school_change_limit on public.user_schools;
create trigger trg_enforce_school_change_limit
  before update on public.user_schools
  for each row execute function public.enforce_school_change_limit();

-- 4. 잔여 변경 횟수 조회 헬퍼 (클라이언트에서 RPC로 호출)
create or replace function public.get_school_change_status(p_user_hash text)
returns table(
  used_count int,
  remaining_count int,
  oldest_change_at timestamptz,
  next_available_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_oldest timestamptz;
  v_count int;
begin
  select count(*), min(changed_at)
  into v_count, v_oldest
  from public.user_school_changes
  where user_hash = p_user_hash
    and changed_at > now() - interval '30 days';

  used_count := v_count;
  remaining_count := greatest(0, 3 - v_count);
  oldest_change_at := v_oldest;
  if v_count >= 3 and v_oldest is not null then
    next_available_at := v_oldest + interval '30 days';
  else
    next_available_at := null;
  end if;
  return next;
end;
$$;

grant execute on function public.get_school_change_status(text) to anon, authenticated;

comment on table public.user_school_changes is '학교 변경 이력 (30일 롤링 3회 제한)';
comment on function public.get_school_change_status is '사용자의 학교 변경 가능 횟수 및 다음 가능일 조회';
