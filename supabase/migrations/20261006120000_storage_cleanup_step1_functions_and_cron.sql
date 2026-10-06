-- Storage cleanup step 1: point maintenance functions/cron at the LA runtime tables.
-- No data is deleted by this migration itself.
-- Rollback: D:\Data\43_LA\backup\20261006\rollback\step1_rollback.sql

-- 1) advance_meal_batch counted legacy public.schools (12,594) while batch-sync-meals
--    pages through public.la_schools (13,809), so each weekly batch stopped early.
--    Patched in place so the embedded API key never lands in this file.
do $$
declare
  def text := pg_get_functiondef('public.advance_meal_batch()'::regprocedure);
begin
  if position('from public.schools;' in def) = 0 then
    raise exception 'advance_meal_batch: expected "from public.schools;" not found';
  end if;
  execute replace(def, 'from public.schools;', 'from public.la_schools;');
end $$;

-- 2) cleanup_old_meals only cleaned legacy public.meals; la_meals was never pruned.
--    Now prunes la_meals and never touches meals referenced by any la_* table
--    (la_reviews cascades on delete, so referenced meals must be kept).
create or replace function public.cleanup_old_meals(
  p_keep_days integer default 90,
  p_batch_size integer default 5000,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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

  create temp table if not exists _referenced_meals (id bigint primary key) on commit drop;
  truncate _referenced_meals;
  insert into _referenced_meals
  select meal_id from public.la_reviews where meal_id is not null
  union select meal_a_id from public.la_battles where meal_a_id is not null
  union select meal_b_id from public.la_battles where meal_b_id is not null
  union select meal_id from public.la_feed_items where meal_id is not null
  union select meal_id from public.la_activity_events where meal_id is not null
  union select meal_id from public.la_review_photos where meal_id is not null;

  select count(*)
    into candidate_count
  from public.la_meals m
  where m.meal_date < cutoff_date
    and not exists (select 1 from _referenced_meals r where r.id = m.id);

  if not p_dry_run then
    with candidate as (
      select m.id
      from public.la_meals m
      where m.meal_date < cutoff_date
        and not exists (select 1 from _referenced_meals r where r.id = m.id)
      order by m.meal_date, m.id
      limit p_batch_size
    ),
    deleted as (
      delete from public.la_meals m
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
    'table', 'la_meals',
    'dry_run', p_dry_run,
    'keep_days', p_keep_days,
    'batch_size', p_batch_size,
    'cutoff_date', cutoff_date,
    'candidate_count', candidate_count,
    'deleted_count', deleted_count
  );
end;
$function$;

-- 3) Monthly rollups are computed from legacy ratings/review tables (frozen since 2026-07).
select cron.unschedule('refresh-recent-monthly-rollups');

-- 4) Daily cleanup cron: larger batch so it keeps up with ~3k new meals/day.
select cron.alter_job(
  (select jobid from cron.job where command like '%cleanup_old_meals%'),
  command := 'select public.cleanup_old_meals(90, 20000, false);'
);

-- 5) cron.job_run_details grew to ~400k rows (two every-minute jobs). Keep 7 days.
select cron.schedule(
  'cleanup-cron-run-details',
  '30 18 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
