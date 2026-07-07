-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 6 of 15

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
