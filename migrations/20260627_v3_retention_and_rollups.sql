-- v3 retention foundation and live monthly rollups.
-- Applied to production Supabase on 2026-06-27.

alter table public.ratings
  drop constraint if exists ratings_meal_id_fkey;

alter table public.ratings
  add constraint ratings_meal_id_fkey
  foreign key (meal_id) references public.meals(id) on delete set null;

alter table public.battles
  drop constraint if exists battles_meal_a_id_fkey;

alter table public.battles
  add constraint battles_meal_a_id_fkey
  foreign key (meal_a_id) references public.meals(id) on delete set null;

alter table public.battles
  drop constraint if exists battles_meal_b_id_fkey;

alter table public.battles
  add constraint battles_meal_b_id_fkey
  foreign key (meal_b_id) references public.meals(id) on delete set null;

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

revoke execute on function public.refresh_school_monthly_rollup_for_school(date, bigint) from public, anon, authenticated;

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

revoke execute on function public.trg_refresh_monthly_rollups_from_rating() from public, anon, authenticated;

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

revoke execute on function public.trg_refresh_monthly_rollups_from_child() from public, anon, authenticated;

drop trigger if exists trg_refresh_monthly_rollups_ratings on public.ratings;
create trigger trg_refresh_monthly_rollups_ratings
after insert or update or delete on public.ratings
for each row execute function public.trg_refresh_monthly_rollups_from_rating();

drop trigger if exists trg_refresh_monthly_rollups_review_comments on public.review_comments;
create trigger trg_refresh_monthly_rollups_review_comments
after insert or update or delete on public.review_comments
for each row execute function public.trg_refresh_monthly_rollups_from_child();

drop trigger if exists trg_refresh_monthly_rollups_review_reactions on public.review_reactions;
create trigger trg_refresh_monthly_rollups_review_reactions
after insert or update or delete on public.review_reactions
for each row execute function public.trg_refresh_monthly_rollups_from_child();

select public.refresh_school_monthly_rollups(date_trunc('month', current_date)::date);