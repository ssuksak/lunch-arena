-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 45 of 49

create or replace function public.refresh_school_monthly_rollups(target_month date default date_trunc('month', current_date)::date)
returns void
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  month_start date := date_trunc('month', target_month)::date;
  month_end date := (date_trunc('month', target_month)::date + interval '1 month')::date;
begin
  delete from public.school_engagement_monthly
  where month = month_start;

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
    and r.school_id is not null
  group by r.school_id;

  delete from public.school_menu_stats_monthly
  where month = month_start;

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
    and r.school_id is not null
    and r.selected_menu_item is not null
    and btrim(r.selected_menu_item) <> ''
  group by r.school_id, r.selected_menu_item;
end;
$$;
