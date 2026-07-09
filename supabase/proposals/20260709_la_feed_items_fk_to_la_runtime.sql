-- Move la_feed_items runtime references from legacy meals/ratings to la_meals/la_reviews.
--
-- Requires the legacy runtime backfill to have already run:
-- - public.meals naturally maps to public.la_meals by school_id + meal_date + meal_type
-- - public.ratings maps to public.la_reviews by mapped meal_id + user_key

begin;

set local statement_timeout = '5min';
set local lock_timeout = '5s';

select pg_advisory_xact_lock(hashtext('la_feed_items_fk_to_la_runtime_20260709'));

create temp table _la_feed_item_runtime_map (
  feed_item_id uuid primary key,
  legacy_meal_id bigint,
  legacy_rating_id bigint,
  la_meal_id bigint,
  la_review_id bigint
) on commit drop;

insert into _la_feed_item_runtime_map (
  feed_item_id,
  legacy_meal_id,
  legacy_rating_id,
  la_meal_id,
  la_review_id
)
select
  f.id,
  f.meal_id,
  f.rating_id,
  lm.id,
  lr.id
from public.la_feed_items f
left join public.meals m on m.id = f.meal_id
left join public.la_meals lm
  on lm.school_id = m.school_id
 and lm.meal_date = m.meal_date
 and lm.meal_type = m.meal_type
left join public.ratings r on r.id = f.rating_id
left join public.meals rm on rm.id = r.meal_id
left join public.la_meals rlm
  on rlm.school_id = rm.school_id
 and rlm.meal_date = rm.meal_date
 and rlm.meal_type = rm.meal_type
left join public.la_reviews lr
  on lr.meal_id is not distinct from rlm.id
 and lr.user_key is not distinct from r.user_key;

do $$
declare
  missing_meals bigint;
  missing_reviews bigint;
begin
  select count(*)
    into missing_meals
  from _la_feed_item_runtime_map
  where legacy_meal_id is not null
    and la_meal_id is null;

  select count(*)
    into missing_reviews
  from _la_feed_item_runtime_map
  where legacy_rating_id is not null
    and la_review_id is null;

  if missing_meals > 0 or missing_reviews > 0 then
    raise exception 'Cannot move la_feed_items FKs: missing_meals=%, missing_reviews=%', missing_meals, missing_reviews;
  end if;
end $$;

update public.la_feed_items f
set meal_id = coalesce(m.la_meal_id, f.meal_id),
    rating_id = coalesce(m.la_review_id, f.rating_id),
    updated_at = now()
from _la_feed_item_runtime_map m
where m.feed_item_id = f.id
  and (
    f.meal_id is distinct from coalesce(m.la_meal_id, f.meal_id)
    or f.rating_id is distinct from coalesce(m.la_review_id, f.rating_id)
  );

alter table public.la_feed_items
  drop constraint if exists la_feed_items_meal_id_fkey,
  drop constraint if exists la_feed_items_rating_id_fkey;

alter table public.la_feed_items
  add constraint la_feed_items_meal_id_fkey
    foreign key (meal_id) references public.la_meals(id) on delete set null,
  add constraint la_feed_items_rating_id_fkey
    foreign key (rating_id) references public.la_reviews(id) on delete set null;

alter table public.la_activity_events validate constraint la_activity_events_meal_id_fkey;
alter table public.la_activity_events validate constraint la_activity_events_rating_id_fkey;

commit;
