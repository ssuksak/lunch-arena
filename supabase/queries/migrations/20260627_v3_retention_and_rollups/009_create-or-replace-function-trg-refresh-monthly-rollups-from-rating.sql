-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 9 of 19

create or replace function public.trg_refresh_monthly_rollups_from_rating()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_school_monthly_rollup_for_school(coalesce(new.created_at, now())::date, new.school_id);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    if tg_op = 'DELETE'
       or old.school_id is distinct from new.school_id
       or date_trunc('month', old.created_at)::date is distinct from date_trunc('month', new.created_at)::date then
      perform public.refresh_school_monthly_rollup_for_school(coalesce(old.created_at, now())::date, old.school_id);
    end if;
  end if;

  return null;
end;
$$;
