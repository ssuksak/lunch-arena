-- v3 DB operations hardening.
-- Safe operational follow-up after the v3 UI/AIT deployment.

-- 1) Prepare comment edit/delete ownership policies.
-- The current app does not expose these controls yet, but adding the policy is
-- backward-compatible and lets the next UI change use the same owner-header
-- pattern as review edit/delete.
grant update (comment, nickname) on public.review_comments to anon, authenticated;
grant delete on public.review_comments to anon, authenticated;

drop policy if exists review_comments_update_own on public.review_comments;
create policy review_comments_update_own
  on public.review_comments
  for update
  to anon, authenticated
  using (
    user_key is not null
    and user_key = nullif(
      (
        nullif((select current_setting('request.headers', true)), '')::json
        ->> 'x-comment-owner-key'
      ),
      ''
    )
  )
  with check (
    user_key is not null
    and user_key = nullif(
      (
        nullif((select current_setting('request.headers', true)), '')::json
        ->> 'x-comment-owner-key'
      ),
      ''
    )
    and char_length(comment) between 1 and 300
  );

drop policy if exists review_comments_delete_own on public.review_comments;
create policy review_comments_delete_own
  on public.review_comments
  for delete
  to anon, authenticated
  using (
    user_key is not null
    and user_key = nullif(
      (
        nullif((select current_setting('request.headers', true)), '')::json
        ->> 'x-comment-owner-key'
      ),
      ''
    )
  );

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

revoke execute on function public.cleanup_old_meals(integer, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.cleanup_old_meals(integer, integer, boolean)
  to postgres, service_role;

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

revoke execute on function public.refresh_recent_monthly_rollups(integer)
  from public, anon, authenticated;
grant execute on function public.refresh_recent_monthly_rollups(integer)
  to postgres, service_role;

-- pg_cron job names are stable so re-running the migration remains idempotent.
do $$
begin
  perform cron.unschedule('cleanup-old-meals-90d');
exception
  when others then null;
end $$;

select cron.schedule(
  'cleanup-old-meals-90d',
  '40 18 * * *',
  $$select public.cleanup_old_meals(90, 5000, false);$$
);

do $$
begin
  perform cron.unschedule('refresh-recent-monthly-rollups');
exception
  when others then null;
end $$;

select cron.schedule(
  'refresh-recent-monthly-rollups',
  '50 18 * * *',
  $$select public.refresh_recent_monthly_rollups(2);$$
);
