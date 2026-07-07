-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 9 of 15

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
