-- Source: migrations/20260627_v3_db_ops_hardening.sql

-- Statement: 7 of 16

-- 2) Bounded meal retention helper.
-- Keep-days is clamped by policy: the function refuses anything under 60 days.
-- It is intentionally revoked from public/anon/authenticated because it deletes
-- source meal rows. Cron/postgres and service_role may execute it.
create or replace function public.cleanup_old_meals(
  p_keep_days integer default 90,
  p_batch_size integer default 5000,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  cutoff_date date;
  candidate_count integer := 0;
  deleted_count integer := 0;
  got_lock boolean := false;
begin
  if p_keep_days < 60 then
    raise exception 'cleanup_old_meals keep_days must be at least 60';
  end if;

  if p_batch_size < 1 or p_batch_size > 20000 then
    raise exception 'cleanup_old_meals batch_size must be between 1 and 20000';
  end if;

  got_lock := pg_try_advisory_xact_lock(hashtext('public.cleanup_old_meals'));
  if not got_lock then
    return jsonb_build_object(
      'ok', false,
      'reason', 'already_running',
      'dry_run', p_dry_run
    );
  end if;

  cutoff_date := current_date - p_keep_days;

  select count(*)
    into candidate_count
  from public.meals
  where meal_date < cutoff_date;

  if not p_dry_run then
    with candidate as (
      select id
      from public.meals
      where meal_date < cutoff_date
      order by meal_date, id
      limit p_batch_size
    ),
    deleted as (
      delete from public.meals m
      using candidate c
      where m.id = c.id
      returning m.id
    )
    select count(*)
      into deleted_count
    from deleted;
  end if;

  return jsonb_build_object(
    'ok', true,
    'dry_run', p_dry_run,
    'keep_days', p_keep_days,
    'batch_size', p_batch_size,
    'cutoff_date', cutoff_date,
    'candidate_count', candidate_count,
    'deleted_count', deleted_count
  );
end;
$$;
