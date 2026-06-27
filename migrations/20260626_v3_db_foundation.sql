-- v3 DB foundation: keep reviews usable after old meal retention and prepare monthly rollups.
-- Applied to production Supabase on 2026-06-26.

alter table public.ratings
  add column if not exists meal_date_snapshot date,
  add column if not exists meal_type_snapshot text,
  add column if not exists meal_menu_snapshot jsonb;

comment on column public.ratings.meal_date_snapshot is '리뷰 작성 당시 식단 날짜 스냅샷. 오래된 meals 삭제 후에도 리뷰 표시용으로 사용';
comment on column public.ratings.meal_type_snapshot is '리뷰 작성 당시 식사 구분 표시값 스냅샷. 예: 중식, 석식';
comment on column public.ratings.meal_menu_snapshot is '리뷰 작성 당시 메뉴 목록 스냅샷. 오래된 meals 삭제 후에도 리뷰 표시용으로 사용';

update public.ratings r
set meal_date_snapshot = coalesce(r.meal_date_snapshot, m.meal_date),
    meal_type_snapshot = coalesce(r.meal_type_snapshot, m.meal_type_label),
    meal_menu_snapshot = coalesce(r.meal_menu_snapshot, m.menu)
from public.meals m
where r.meal_id = m.id
  and (r.meal_date_snapshot is null or r.meal_type_snapshot is null or r.meal_menu_snapshot is null);

create or replace function public.fill_rating_meal_snapshot()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.meal_id is not null and
     (new.meal_date_snapshot is null or new.meal_type_snapshot is null or new.meal_menu_snapshot is null) then
    select m.meal_date, m.meal_type_label, m.menu
      into new.meal_date_snapshot, new.meal_type_snapshot, new.meal_menu_snapshot
    from public.meals m
    where m.id = new.meal_id;
  end if;

  return new;
end;
$$;

revoke execute on function public.fill_rating_meal_snapshot() from public, anon, authenticated;

drop trigger if exists trg_fill_rating_meal_snapshot on public.ratings;
create trigger trg_fill_rating_meal_snapshot
before insert or update of meal_id, meal_date_snapshot, meal_type_snapshot, meal_menu_snapshot
on public.ratings
for each row execute function public.fill_rating_meal_snapshot();

create index if not exists idx_ratings_school_created
  on public.ratings(school_id, created_at desc);

create index if not exists idx_ratings_school_meal_created
  on public.ratings(school_id, meal_id, created_at desc);

create index if not exists idx_ratings_school_created_menu
  on public.ratings(school_id, created_at desc, selected_menu_item)
  where selected_menu_item is not null;

create index if not exists idx_review_reactions_rating_reaction
  on public.review_reactions(rating_id, reaction);

create index if not exists idx_review_comments_user_created
  on public.review_comments(user_key, created_at desc);

create index if not exists idx_battles_school_a_id
  on public.battles(school_a_id);

create index if not exists idx_battles_school_b_id
  on public.battles(school_b_id);

create index if not exists idx_battles_meal_a_id
  on public.battles(meal_a_id);

create index if not exists idx_battles_meal_b_id
  on public.battles(meal_b_id);

create index if not exists idx_battles_winner_id
  on public.battles(winner_id);

create index if not exists idx_battle_votes_voted_school_id
  on public.battle_votes(voted_school_id);

create index if not exists idx_school_stats_school_id
  on public.school_stats(school_id);

create index if not exists idx_daily_rankings_school_id
  on public.daily_rankings(school_id);

create table if not exists public.school_engagement_monthly (
  month date not null,
  school_id bigint not null references public.schools(id) on delete cascade,
  review_count integer not null default 0,
  comment_count integer not null default 0,
  reaction_count integer not null default 0,
  photo_count integer not null default 0,
  score integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (month, school_id)
);

comment on table public.school_engagement_monthly is 'v3 학교별 월간 참여도 랭킹용 집계 테이블. 원본 리뷰/댓글/반응을 매번 훑지 않도록 사용';
comment on column public.school_engagement_monthly.month is '해당 월의 1일 날짜';
comment on column public.school_engagement_monthly.score is '리뷰, 댓글, 반응, 사진 등을 합산한 월간 참여도 점수';

alter table public.school_engagement_monthly enable row level security;

drop policy if exists school_engagement_monthly_read on public.school_engagement_monthly;
create policy school_engagement_monthly_read
  on public.school_engagement_monthly
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.school_engagement_monthly from anon, authenticated;
grant select on public.school_engagement_monthly to anon, authenticated;

create index if not exists idx_school_engagement_monthly_rank
  on public.school_engagement_monthly(month, score desc, review_count desc);

create index if not exists idx_school_engagement_monthly_school_id
  on public.school_engagement_monthly(school_id);

create table if not exists public.school_menu_stats_monthly (
  month date not null,
  school_id bigint not null references public.schools(id) on delete cascade,
  menu_item text not null,
  pick_count integer not null default 0,
  avg_score numeric(4,2),
  photo_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (month, school_id, menu_item)
);

comment on table public.school_menu_stats_monthly is 'v3 학교별 대표메뉴/인증샷 확장용 월간 메뉴 집계 테이블';
comment on column public.school_menu_stats_monthly.month is '해당 월의 1일 날짜';
comment on column public.school_menu_stats_monthly.menu_item is '리뷰 작성자가 대표 메뉴로 선택한 메뉴명';

alter table public.school_menu_stats_monthly enable row level security;

drop policy if exists school_menu_stats_monthly_read on public.school_menu_stats_monthly;
create policy school_menu_stats_monthly_read
  on public.school_menu_stats_monthly
  for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.school_menu_stats_monthly from anon, authenticated;
grant select on public.school_menu_stats_monthly to anon, authenticated;

create index if not exists idx_school_menu_stats_monthly_rank
  on public.school_menu_stats_monthly(month, school_id, pick_count desc, avg_score desc);

create index if not exists idx_school_menu_stats_monthly_school_id
  on public.school_menu_stats_monthly(school_id);

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

revoke execute on function public.refresh_school_monthly_rollups(date) from public, anon, authenticated;

select public.refresh_school_monthly_rollups(date_trunc('month', current_date)::date);

drop policy if exists review_reactions_delete on public.review_reactions;
create policy review_reactions_delete
  on public.review_reactions
  for delete
  to anon, authenticated
  using (
    cancel_token_hash is not null
    and cancel_token_hash = nullif(
      (
        nullif((select current_setting('request.headers', true)), '')::json
        ->> 'x-reaction-cancel-token-hash'
      ),
      ''
    )
  );