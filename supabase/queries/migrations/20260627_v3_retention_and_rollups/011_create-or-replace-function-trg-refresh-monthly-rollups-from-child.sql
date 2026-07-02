-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 11 of 19

create or replace function public.trg_refresh_monthly_rollups_from_child()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  old_rating public.ratings%rowtype;
  new_rating public.ratings%rowtype;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    select * into new_rating from public.ratings where id = new.rating_id;
    if found then
      perform public.refresh_school_monthly_rollup_for_school(coalesce(new_rating.created_at, now())::date, new_rating.school_id);
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    select * into old_rating from public.ratings where id = old.rating_id;
    if found then
      if tg_op = 'DELETE'
         or old.rating_id is distinct from new.rating_id then
        perform public.refresh_school_monthly_rollup_for_school(coalesce(old_rating.created_at, now())::date, old_rating.school_id);
      end if;
    end if;
  end if;

  return null;
end;
$$;
