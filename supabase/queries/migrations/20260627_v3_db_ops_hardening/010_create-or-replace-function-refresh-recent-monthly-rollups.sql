-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 10 of 16

-- 3) Daily repair for current monthly rollups.
-- Triggers handle normal writes; this cron is a cheap safety net for missed
-- trigger runs or manual corrections.
create or replace function public.refresh_recent_monthly_rollups(p_months integer default 2)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  i integer;
  month_start date;
begin
  if p_months < 1 or p_months > 6 then
    raise exception 'refresh_recent_monthly_rollups p_months must be between 1 and 6';
  end if;

  for i in 0..(p_months - 1) loop
    month_start := (date_trunc('month', current_date)::date - make_interval(months => i))::date;
    perform public.refresh_school_monthly_rollups(month_start);
  end loop;

  return jsonb_build_object('ok', true, 'months_refreshed', p_months);
end;
$$;
