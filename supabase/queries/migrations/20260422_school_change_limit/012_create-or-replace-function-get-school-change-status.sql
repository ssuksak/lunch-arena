-- Source: migrations/20260422_school_change_limit.sql

-- Statement: 12 of 15

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
