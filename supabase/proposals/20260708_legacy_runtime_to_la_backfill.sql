-- Backfill legacy runtime data into the LA-owned runtime tables.
--
-- Purpose:
-- - Preserve existing user-visible data before deploying the LA-only frontend.
-- - Keep existing la_* rows, including test rows, instead of overwriting by id.
-- - Map legacy meals to la_meals by natural key: school_id + meal_date + meal_type.
-- - Map legacy reviews and battles to the resulting la_* ids before copying child rows.
--
-- Review before running on production. This script is intended to be executed once,
-- but its inserts avoid the most likely duplicate cases if it is retried.

begin;

set local statement_timeout = '10min';
set local lock_timeout = '5s';

select pg_advisory_xact_lock(hashtext('la_legacy_runtime_backfill_20260708'));

-- 1. Keep the LA school master aligned with the legacy school master.
insert into public.la_schools (
  id,
  atpt_code,
  school_code,
  name,
  type,
  address,
  lat,
  lng,
  total_rating_score,
  rating_count,
  metadata,
  created_at,
  updated_at
)
select
  id,
  atpt_code,
  school_code,
  name,
  type,
  address,
  lat,
  lng,
  coalesce(total_rating_score, 0),
  coalesce(rating_count, 0),
  jsonb_build_object('migrated_from', 'schools'),
  coalesce(created_at, now()),
  now()
from public.schools
on conflict (id) do update
set atpt_code = excluded.atpt_code,
    school_code = excluded.school_code,
    name = excluded.name,
    type = excluded.type,
    address = excluded.address,
    lat = excluded.lat,
    lng = excluded.lng,
    total_rating_score = excluded.total_rating_score,
    rating_count = excluded.rating_count,
    updated_at = now();

-- 2. Copy legacy user identities and school selections. Some user_schools rows
--    have no school_id/code; those users still get la_users/la_user_keys and
--    profile names, but no current school membership is created.
insert into public.la_users (
  primary_user_key,
  metadata,
  created_at,
  updated_at,
  last_seen_at
)
select
  us.user_key,
  jsonb_build_object('migrated_from', 'user_schools', 'backfill', '20260708_legacy_runtime_to_la'),
  coalesce(us.created_at, now()),
  coalesce(us.updated_at, us.created_at, now()),
  coalesce(us.updated_at, us.created_at, now())
from public.user_schools us
where us.user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$'
  and not exists (
    select 1
    from public.la_user_keys luk
    where luk.user_key = us.user_key
  )
  and not exists (
    select 1
    from public.la_users lu
    where lu.primary_user_key = us.user_key
  );

insert into public.la_user_keys (
  user_key,
  user_id,
  source,
  is_primary,
  verified_at,
  metadata,
  created_at,
  updated_at
)
select
  us.user_key,
  lu.id,
  case
    when us.source in ('toss', 'fp') then us.source
    when us.user_key like 'toss_%' then 'toss'
    when us.user_key like 'fp_%' then 'fp'
    else 'legacy'
  end,
  true,
  coalesce(us.updated_at, us.created_at, now()),
  jsonb_build_object('migrated_from', 'user_schools', 'backfill', '20260708_legacy_runtime_to_la'),
  coalesce(us.created_at, now()),
  coalesce(us.updated_at, us.created_at, now())
from public.user_schools us
join public.la_users lu on lu.primary_user_key = us.user_key
where us.user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$'
on conflict (user_key) do update
set source = excluded.source,
    retired_at = null,
    metadata = public.la_user_keys.metadata || excluded.metadata,
    updated_at = now();

create temp table _la_legacy_user_school_map (
  user_key text primary key,
  user_id uuid not null,
  legacy_school_id bigint,
  la_school_id bigint,
  nickname text,
  source text,
  created_at timestamptz,
  updated_at timestamptz
) on commit drop;

insert into _la_legacy_user_school_map (
  user_key,
  user_id,
  legacy_school_id,
  la_school_id,
  nickname,
  source,
  created_at,
  updated_at
)
select
  us.user_key,
  luk.user_id,
  us.school_id,
  coalesce(ls_by_id.id, ls_by_code.id),
  nullif(btrim(us.nickname), ''),
  us.source,
  us.created_at,
  us.updated_at
from public.user_schools us
join public.la_user_keys luk on luk.user_key = us.user_key
left join public.la_schools ls_by_id on ls_by_id.id = us.school_id
left join public.la_schools ls_by_code
  on ls_by_code.atpt_code = us.atpt_code
 and ls_by_code.school_code = us.school_code
where us.user_key ~ '^(toss_|fp_)[A-Za-z0-9_-]{8,128}$';

insert into public.la_user_profiles (
  user_id,
  display_name,
  selected_school_id,
  metadata,
  created_at,
  updated_at,
  last_seen_at
)
select
  m.user_id,
  case when m.nickname is not null and char_length(m.nickname) between 2 and 12 then m.nickname else null end,
  m.la_school_id,
  jsonb_build_object('migrated_from', 'user_schools', 'backfill', '20260708_legacy_runtime_to_la'),
  coalesce(m.created_at, now()),
  coalesce(m.updated_at, m.created_at, now()),
  coalesce(m.updated_at, m.created_at, now())
from _la_legacy_user_school_map m
on conflict (user_id) do update
set display_name = coalesce(excluded.display_name, public.la_user_profiles.display_name),
    selected_school_id = coalesce(public.la_user_profiles.selected_school_id, excluded.selected_school_id),
    metadata = public.la_user_profiles.metadata || excluded.metadata,
    last_seen_at = greatest(
      coalesce(public.la_user_profiles.last_seen_at, '-infinity'::timestamptz),
      coalesce(excluded.last_seen_at, '-infinity'::timestamptz)
    ),
    updated_at = now();

insert into public.la_user_school_memberships (
  user_id,
  user_key,
  school_id,
  role,
  is_current,
  source,
  started_at,
  metadata,
  created_at,
  updated_at
)
select
  m.user_id,
  m.user_key,
  m.la_school_id,
  'student',
  true,
  'user_schools',
  coalesce(m.created_at, now()),
  jsonb_build_object('migrated_from', 'user_schools', 'backfill', '20260708_legacy_runtime_to_la'),
  coalesce(m.created_at, now()),
  coalesce(m.updated_at, m.created_at, now())
from _la_legacy_user_school_map m
where m.la_school_id is not null
  and not exists (
    select 1
    from public.la_user_school_memberships current_membership
    where current_membership.user_id = m.user_id
      and current_membership.is_current = true
  );

-- 3. Copy missing meals by natural key. Do not preserve legacy meal ids because
--    existing la_meals can already use the same id for a different natural key.
insert into public.la_meals (
  school_id,
  meal_date,
  menu,
  calories,
  nutrition,
  auto_score,
  auto_rank,
  created_at,
  meal_type,
  meal_type_label,
  neis_meal_code
)
select
  m.school_id,
  m.meal_date,
  m.menu,
  m.calories,
  m.nutrition,
  m.auto_score,
  m.auto_rank,
  coalesce(m.created_at, now()),
  m.meal_type,
  m.meal_type_label,
  m.neis_meal_code
from public.meals m
where not exists (
  select 1
  from public.la_meals lm
  where lm.school_id = m.school_id
    and lm.meal_date = m.meal_date
    and lm.meal_type = m.meal_type
)
on conflict (school_id, meal_date, meal_type) do update
set menu = excluded.menu,
    calories = excluded.calories,
    nutrition = excluded.nutrition,
    auto_score = excluded.auto_score,
    auto_rank = excluded.auto_rank,
    meal_type_label = excluded.meal_type_label,
    neis_meal_code = excluded.neis_meal_code;

create temp table _la_legacy_meal_map (
  legacy_meal_id bigint primary key,
  la_meal_id bigint not null
) on commit drop;

insert into _la_legacy_meal_map (legacy_meal_id, la_meal_id)
select m.id, lm.id
from public.meals m
join public.la_meals lm
  on lm.school_id = m.school_id
 and lm.meal_date = m.meal_date
 and lm.meal_type = m.meal_type;

-- 4. Copy legacy reviews. The app does not require legacy review ids to be
--    preserved, so generated la_reviews ids avoid collisions with existing rows.
insert into public.la_reviews (
  meal_id,
  school_id,
  score,
  comment,
  user_key,
  created_at,
  photo_url,
  nickname,
  selected_menu_item,
  meal_date_snapshot,
  meal_type_snapshot,
  meal_menu_snapshot
)
select
  mm.la_meal_id,
  r.school_id,
  r.score,
  r.comment,
  r.user_key,
  coalesce(r.created_at, now()),
  r.photo_url,
  r.nickname,
  r.selected_menu_item,
  coalesce(r.meal_date_snapshot, m.meal_date),
  coalesce(r.meal_type_snapshot, m.meal_type_label),
  coalesce(r.meal_menu_snapshot, m.menu)
from public.ratings r
left join public.meals m on m.id = r.meal_id
left join _la_legacy_meal_map mm on mm.legacy_meal_id = r.meal_id
where (r.meal_id is null or mm.la_meal_id is not null)
  and not exists (
    select 1
    from public.la_reviews lr
    where lr.meal_id is not distinct from mm.la_meal_id
      and lr.user_key is not distinct from r.user_key
  )
on conflict (meal_id, user_key) do update
set school_id = excluded.school_id,
    score = excluded.score,
    comment = excluded.comment,
    photo_url = excluded.photo_url,
    nickname = excluded.nickname,
    selected_menu_item = excluded.selected_menu_item,
    meal_date_snapshot = excluded.meal_date_snapshot,
    meal_type_snapshot = excluded.meal_type_snapshot,
    meal_menu_snapshot = excluded.meal_menu_snapshot;

create temp table _la_legacy_review_map (
  legacy_rating_id bigint primary key,
  la_review_id bigint not null
) on commit drop;

insert into _la_legacy_review_map (legacy_rating_id, la_review_id)
select r.id, lr.id
from public.ratings r
left join _la_legacy_meal_map mm on mm.legacy_meal_id = r.meal_id
join public.la_reviews lr
  on lr.meal_id is not distinct from mm.la_meal_id
 and lr.user_key is not distinct from r.user_key;

-- 5. Copy legacy review comments.
insert into public.la_review_comments (
  rating_id,
  user_key,
  nickname,
  comment,
  created_at
)
select
  rm.la_review_id,
  c.user_key,
  c.nickname,
  c.comment,
  coalesce(c.created_at, now())
from public.review_comments c
join _la_legacy_review_map rm on rm.legacy_rating_id = c.rating_id
where not exists (
  select 1
  from public.la_review_comments lc
  where lc.rating_id = rm.la_review_id
    and lc.user_key = c.user_key
    and lc.comment = c.comment
    and lc.created_at is not distinct from c.created_at
);

-- 6. Copy legacy review reactions.
insert into public.la_review_reactions (
  rating_id,
  user_key,
  nickname,
  reaction,
  created_at,
  cancel_token_hash
)
select
  rm.la_review_id,
  rr.user_key,
  rr.nickname,
  rr.reaction,
  coalesce(rr.created_at, now()),
  rr.cancel_token_hash
from public.review_reactions rr
join _la_legacy_review_map rm on rm.legacy_rating_id = rr.rating_id
on conflict (rating_id, user_key) do update
set nickname = excluded.nickname,
    reaction = excluded.reaction,
    cancel_token_hash = excluded.cancel_token_hash;

-- 7. Copy legacy battles. Meal references are mapped through natural-key meals.
insert into public.la_battles (
  battle_date,
  school_a_id,
  school_b_id,
  meal_a_id,
  meal_b_id,
  score_a,
  score_b,
  vote_a,
  vote_b,
  winner_id,
  status,
  created_at
)
select
  b.battle_date,
  b.school_a_id,
  b.school_b_id,
  ma.la_meal_id,
  mb.la_meal_id,
  coalesce(b.score_a, 0),
  coalesce(b.score_b, 0),
  coalesce(b.vote_a, 0),
  coalesce(b.vote_b, 0),
  b.winner_id,
  coalesce(b.status, 'active'),
  coalesce(b.created_at, now())
from public.battles b
join _la_legacy_meal_map ma on ma.legacy_meal_id = b.meal_a_id
join _la_legacy_meal_map mb on mb.legacy_meal_id = b.meal_b_id
where not exists (
  select 1
  from public.la_battles lb
  where lb.battle_date = b.battle_date
    and lb.school_a_id = b.school_a_id
    and lb.school_b_id = b.school_b_id
)
on conflict (battle_date, school_a_id, school_b_id) do update
set meal_a_id = excluded.meal_a_id,
    meal_b_id = excluded.meal_b_id,
    score_a = excluded.score_a,
    score_b = excluded.score_b,
    vote_a = excluded.vote_a,
    vote_b = excluded.vote_b,
    winner_id = excluded.winner_id,
    status = excluded.status;

create temp table _la_legacy_battle_map (
  legacy_battle_id bigint primary key,
  la_battle_id bigint not null
) on commit drop;

insert into _la_legacy_battle_map (legacy_battle_id, la_battle_id)
select b.id, lb.id
from public.battles b
join public.la_battles lb
  on lb.battle_date = b.battle_date
 and lb.school_a_id = b.school_a_id
 and lb.school_b_id = b.school_b_id;

-- 8. Copy legacy battle votes.
insert into public.la_battle_votes (
  battle_id,
  voted_school_id,
  user_key,
  created_at
)
select
  bm.la_battle_id,
  bv.voted_school_id,
  bv.user_key,
  coalesce(bv.created_at, now())
from public.battle_votes bv
join _la_legacy_battle_map bm on bm.legacy_battle_id = bv.battle_id
on conflict (battle_id, user_key) do update
set voted_school_id = excluded.voted_school_id;

-- 9. Keep identity sequences ahead of copied/generated rows.
select setval(pg_get_serial_sequence('public.la_schools', 'id'), greatest((select coalesce(max(id), 1) from public.la_schools), 1), true);
select setval(pg_get_serial_sequence('public.la_meals', 'id'), greatest((select coalesce(max(id), 1) from public.la_meals), 1), true);
select setval(pg_get_serial_sequence('public.la_reviews', 'id'), greatest((select coalesce(max(id), 1) from public.la_reviews), 1), true);
select setval(pg_get_serial_sequence('public.la_review_comments', 'id'), greatest((select coalesce(max(id), 1) from public.la_review_comments), 1), true);
select setval(pg_get_serial_sequence('public.la_review_reactions', 'id'), greatest((select coalesce(max(id), 1) from public.la_review_reactions), 1), true);
select setval(pg_get_serial_sequence('public.la_battles', 'id'), greatest((select coalesce(max(id), 1) from public.la_battles), 1), true);
select setval(pg_get_serial_sequence('public.la_battle_votes', 'id'), greatest((select coalesce(max(id), 1) from public.la_battle_votes), 1), true);

-- 10. Return post-backfill counts for verification.
select 'la_schools' as table_name, count(*)::bigint as rows from public.la_schools
union all select 'la_meals', count(*) from public.la_meals
union all select 'la_reviews', count(*) from public.la_reviews
union all select 'la_review_comments', count(*) from public.la_review_comments
union all select 'la_review_reactions', count(*) from public.la_review_reactions
union all select 'la_battles', count(*) from public.la_battles
union all select 'la_battle_votes', count(*) from public.la_battle_votes
union all select 'la_users', count(*) from public.la_users
union all select 'la_user_keys', count(*) from public.la_user_keys
union all select 'la_user_profiles', count(*) from public.la_user_profiles
union all select 'la_user_school_memberships', count(*) from public.la_user_school_memberships
order by table_name;

commit;
