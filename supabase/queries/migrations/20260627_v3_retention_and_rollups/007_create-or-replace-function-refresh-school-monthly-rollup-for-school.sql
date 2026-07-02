-- Source: migrations/20260627_v3_retention_and_rollups.sql

-- Statement: 7 of 19

create or replace function public.refresh_school_monthly_rollup_for_school(target_month date, target_school_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  month_start date := date_trunc('month', target_month)::date;
  month_end date := (date_trunc('month', target_month)::date + interval '1 month')::date;
begin
  if target_school_id is null then
    return;
  end if;

  delete from public.school_engagement_monthly
  where month = month_start
    and school_id = target_school_id;

  insert into public.school_engagement_monthly (
    month,
    school_id,
    review_count,
    comment_count,
    reaction_count,
    photo_count,
    score,
    updated_at
  )
  select
    month_start,
    r.school_id,
    count(distinct r.id)::integer as review_count,
    count(distinct c.id)::integer as comment_count,
    count(distinct rr.id)::integer as reaction_count,
    count(distinct r.id) filter (where r.photo_url is not null and r.photo_url <> '')::integer as photo_count,
    (
      count(distinct r.id) * 10
      + count(distinct c.id) * 3
      + count(distinct rr.id)
      + count(distinct r.id) filter (where r.photo_url is not null and r.photo_url <> '') * 5
    )::integer as score,
    now()
  from public.ratings r
  left join public.review_comments c on c.rating_id = r.id
  left join public.review_reactions rr on rr.rating_id = r.id
  where r.created_at >= month_start
    and r.created_at < month_end
    and r.school_id = target_school_id
  group by r.school_id;

  delete from public.school_menu_stats_monthly
  where month = month_start
    and school_id = target_school_id;

  insert into public.school_menu_stats_monthly (
    month,
    school_id,
    menu_item,
    pick_count,
    avg_score,
    photo_count,
    updated_at
  )
  select
    month_start,
    r.school_id,
    r.selected_menu_item,
    count(*)::integer as pick_count,
    round(avg(r.score)::numeric, 2) as avg_score,
    count(*) filter (where r.photo_url is not null and r.photo_url <> '')::integer as photo_count,
    now()
  from public.ratings r
  where r.created_at >= month_start
    and r.created_at < month_end
    and r.school_id = target_school_id
    and r.selected_menu_item is not null
    and btrim(r.selected_menu_item) <> ''
  group by r.school_id, r.selected_menu_item;
end;
$$;
