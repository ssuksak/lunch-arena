-- New Lunch Arena table layer proposal.
-- Date: 2026-06-29
--
-- This file is intentionally a proposal and has not been applied to production.
-- Rule: do not alter existing production tables. This creates only new la_* types,
-- la_* tables, indexes, comments, grants, and RLS policies.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'la_user_status') then
    create type public.la_user_status as enum ('active', 'limited', 'blocked', 'deleted');
  end if;

  if not exists (select 1 from pg_type where typname = 'la_visibility') then
    create type public.la_visibility as enum ('public', 'school_only', 'hidden', 'deleted');
  end if;

  if not exists (select 1 from pg_type where typname = 'la_media_status') then
    create type public.la_media_status as enum ('pending', 'active', 'deleted', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'la_moderation_status') then
    create type public.la_moderation_status as enum ('unreviewed', 'approved', 'flagged', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'la_report_status') then
    create type public.la_report_status as enum ('open', 'reviewing', 'resolved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'la_activity_event_type') then
    create type public.la_activity_event_type as enum (
      'review_created',
      'review_updated',
      'review_deleted',
      'comment_created',
      'comment_updated',
      'comment_deleted',
      'reaction_created',
      'reaction_deleted',
      'photo_uploaded',
      'photo_approved',
      'photo_rejected',
      'battle_vote_created',
      'school_changed',
      'mission_completed',
      'moderation_report_created',
      'moderation_action_created'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'la_activity_target_type') then
    create type public.la_activity_target_type as enum (
      'rating',
      'comment',
      'reaction',
      'photo',
      'user',
      'school',
      'meal',
      'battle',
      'feed_item',
      'mission'
    );
  end if;
end;
$$;

create table if not exists public.la_users (
  id uuid primary key default gen_random_uuid(),
  primary_user_key text,
  status public.la_user_status not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.la_user_keys (
  user_key text primary key,
  user_id uuid not null references public.la_users(id) on delete cascade,
  source text not null check (source in ('toss', 'fp', 'admin', 'system', 'legacy')),
  is_primary boolean not null default false,
  verified_at timestamptz,
  retired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source = 'toss' and user_key ~ '^toss_[A-Za-z0-9_-]{8,128}$')
    or (source = 'fp' and user_key ~ '^fp_[A-Za-z0-9_-]{8,128}$')
    or (source in ('admin', 'system', 'legacy') and user_key ~ '^[A-Za-z0-9:_-]{3,160}$')
  )
);

create table if not exists public.la_user_profiles (
  user_id uuid primary key references public.la_users(id) on delete cascade,
  display_name text,
  selected_school_id bigint references public.schools(id) on delete set null,
  trust_score integer not null default 0 check (trust_score >= -1000 and trust_score <= 1000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.la_user_school_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.la_users(id) on delete cascade,
  user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint not null references public.schools(id) on delete cascade,
  role text not null default 'unknown' check (role in ('student', 'alumni', 'parent', 'fan', 'unknown')),
  is_current boolean not null default true,
  source text not null default 'user_schools' check (source in ('user_schools', 'profile', 'admin', 'import')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((is_current = true and ended_at is null) or (is_current = false))
);

create table if not exists public.la_user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.la_users(id) on delete cascade,
  user_key text references public.la_user_keys(user_key) on delete set null,
  device_key_hash text not null,
  source text not null check (source in ('toss', 'fp', 'admin', 'system', 'legacy')),
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_key_hash)
);

create table if not exists public.la_activity_events (
  id uuid primary key default gen_random_uuid(),
  event_type public.la_activity_event_type not null,
  actor_user_id uuid references public.la_users(id) on delete set null,
  actor_user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  meal_id bigint references public.meals(id) on delete set null,
  rating_id bigint references public.ratings(id) on delete set null,
  target_type public.la_activity_target_type,
  target_id text,
  occurred_at timestamptz not null default now(),
  idempotency_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.la_user_point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.la_users(id) on delete cascade,
  user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  event_id uuid references public.la_activity_events(id) on delete set null,
  point_type text not null,
  points integer not null check (points <> 0),
  period_month date not null,
  idempotency_key text not null unique,
  reason text,
  created_at timestamptz not null default now(),
  check (period_month = date_trunc('month', period_month)::date)
);

create table if not exists public.la_feed_items (
  id uuid primary key default gen_random_uuid(),
  source_event_id uuid references public.la_activity_events(id) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  meal_id bigint references public.meals(id) on delete set null,
  rating_id bigint references public.ratings(id) on delete set null,
  feed_scope text not null check (feed_scope in ('global', 'school', 'meal')),
  title text,
  summary text,
  thumbnail_url text,
  rank_score numeric(12,4) not null default 0,
  visibility public.la_visibility not null default 'hidden',
  published_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.la_review_photos (
  id uuid primary key default gen_random_uuid(),
  rating_id bigint not null references public.ratings(id) on delete cascade,
  school_id bigint references public.schools(id) on delete set null,
  meal_id bigint references public.meals(id) on delete set null,
  owner_user_id uuid references public.la_users(id) on delete set null,
  owner_user_key text references public.la_user_keys(user_key) on delete set null,
  storage_provider text not null default 'r2' check (storage_provider = 'r2'),
  bucket_name text not null,
  object_key text not null,
  public_url text,
  thumbnail_object_key text,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 2000000),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  status public.la_media_status not null default 'pending',
  moderation_status public.la_moderation_status not null default 'unreviewed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (storage_provider, bucket_name, object_key)
);

create table if not exists public.la_moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.la_users(id) on delete set null,
  reporter_user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  target_type public.la_activity_target_type not null,
  target_id text not null,
  reason text not null,
  details text,
  status public.la_report_status not null default 'open',
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.la_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.la_moderation_reports(id) on delete set null,
  moderator_key text,
  target_type public.la_activity_target_type not null,
  target_id text not null,
  action text not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.la_user_safety_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.la_users(id) on delete cascade,
  user_key text references public.la_user_keys(user_key) on delete set null,
  flag_type text not null,
  severity integer not null default 1 check (severity between 1 and 5),
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.la_missions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  mission_type text not null,
  scope text not null check (scope in ('global', 'school', 'user')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  target_count integer not null default 1 check (target_count > 0),
  reward_points integer not null default 0 check (reward_points >= 0),
  is_active boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.la_mission_school_targets (
  mission_id uuid not null references public.la_missions(id) on delete cascade,
  school_id bigint not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (mission_id, school_id)
);

create table if not exists public.la_user_mission_progress (
  mission_id uuid not null references public.la_missions(id) on delete cascade,
  user_id uuid not null references public.la_users(id) on delete cascade,
  user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  progress_count integer not null default 0 check (progress_count >= 0),
  completed_at timestamptz,
  rewarded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (mission_id, user_id)
);

create table if not exists public.la_school_daily_metrics (
  metric_date date not null,
  school_id bigint not null references public.schools(id) on delete cascade,
  review_count integer not null default 0,
  comment_count integer not null default 0,
  reaction_count integer not null default 0,
  photo_count integer not null default 0,
  active_user_count integer not null default 0,
  point_total integer not null default 0,
  avg_score numeric(4,2),
  top_menu_item text,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (metric_date, school_id)
);

create table if not exists public.la_leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  leaderboard_type text not null,
  period_start date not null,
  period_end date not null,
  scope text not null default 'global',
  school_id bigint not null references public.schools(id) on delete cascade,
  rank integer not null check (rank > 0),
  score numeric(12,4) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (leaderboard_type, period_start, period_end, scope, school_id),
  check (period_end >= period_start)
);

create table if not exists public.la_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  attempt integer not null default 1 check (attempt > 0),
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.la_app_config (
  key text primary key,
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_la_users_primary_user_key
  on public.la_users(primary_user_key)
  where primary_user_key is not null;
create index if not exists idx_la_users_status_last_seen on public.la_users(status, last_seen_at desc);
create unique index if not exists idx_la_user_keys_one_primary
  on public.la_user_keys(user_id)
  where is_primary = true and retired_at is null;
create index if not exists idx_la_user_keys_user_id on public.la_user_keys(user_id);
create index if not exists idx_la_user_profiles_school on public.la_user_profiles(selected_school_id);
create unique index if not exists idx_la_user_school_memberships_current
  on public.la_user_school_memberships(user_id)
  where is_current = true;
create index if not exists idx_la_user_school_memberships_school on public.la_user_school_memberships(school_id, is_current);
create index if not exists idx_la_user_devices_user_last_seen on public.la_user_devices(user_id, last_seen_at desc);

create index if not exists idx_la_activity_events_school_time on public.la_activity_events(school_id, occurred_at desc);
create index if not exists idx_la_activity_events_actor_time on public.la_activity_events(actor_user_id, occurred_at desc);
create index if not exists idx_la_activity_events_actor_key_time on public.la_activity_events(actor_user_key, occurred_at desc);
create index if not exists idx_la_activity_events_type_time on public.la_activity_events(event_type, occurred_at desc);
create index if not exists idx_la_activity_events_rating on public.la_activity_events(rating_id);

create index if not exists idx_la_user_point_ledger_user_month on public.la_user_point_ledger(user_id, period_month);
create index if not exists idx_la_user_point_ledger_user_key_month on public.la_user_point_ledger(user_key, period_month);
create index if not exists idx_la_user_point_ledger_school_month on public.la_user_point_ledger(school_id, period_month);

create index if not exists idx_la_feed_items_public_rank on public.la_feed_items(feed_scope, rank_score desc, published_at desc)
  where visibility = 'public';
create index if not exists idx_la_feed_items_school_public on public.la_feed_items(school_id, rank_score desc, published_at desc)
  where visibility = 'public';
create index if not exists idx_la_feed_items_rating on public.la_feed_items(rating_id);

create index if not exists idx_la_review_photos_rating on public.la_review_photos(rating_id);
create index if not exists idx_la_review_photos_school_created on public.la_review_photos(school_id, created_at desc);
create index if not exists idx_la_review_photos_public on public.la_review_photos(school_id, created_at desc)
  where status = 'active' and moderation_status = 'approved';

create index if not exists idx_la_moderation_reports_status_created on public.la_moderation_reports(status, created_at desc);
create index if not exists idx_la_moderation_reports_target on public.la_moderation_reports(target_type, target_id);
create unique index if not exists idx_la_moderation_reports_reporter_user_dedupe
  on public.la_moderation_reports(reporter_user_id, target_type, target_id, reason)
  where reporter_user_id is not null;
create unique index if not exists idx_la_moderation_reports_reporter_key_dedupe
  on public.la_moderation_reports(reporter_user_key, target_type, target_id, reason)
  where reporter_user_id is null and reporter_user_key is not null;
create index if not exists idx_la_moderation_actions_target on public.la_moderation_actions(target_type, target_id, created_at desc);
create index if not exists idx_la_user_safety_flags_user_status on public.la_user_safety_flags(user_id, status);

create index if not exists idx_la_missions_active_time on public.la_missions(is_active, starts_at, ends_at);
create index if not exists idx_la_mission_school_targets_school on public.la_mission_school_targets(school_id);
create index if not exists idx_la_user_mission_progress_user on public.la_user_mission_progress(user_id, updated_at desc);

create index if not exists idx_la_school_daily_metrics_rank on public.la_school_daily_metrics(metric_date, point_total desc, review_count desc);
create index if not exists idx_la_leaderboard_snapshots_lookup on public.la_leaderboard_snapshots(leaderboard_type, period_start, period_end, scope, rank);
create index if not exists idx_la_job_runs_name_started on public.la_job_runs(job_name, started_at desc);
create index if not exists idx_la_app_config_public on public.la_app_config(key) where is_public = true;

alter table public.la_users enable row level security;
alter table public.la_user_keys enable row level security;
alter table public.la_user_profiles enable row level security;
alter table public.la_user_school_memberships enable row level security;
alter table public.la_user_devices enable row level security;
alter table public.la_activity_events enable row level security;
alter table public.la_user_point_ledger enable row level security;
alter table public.la_feed_items enable row level security;
alter table public.la_review_photos enable row level security;
alter table public.la_moderation_reports enable row level security;
alter table public.la_moderation_actions enable row level security;
alter table public.la_user_safety_flags enable row level security;
alter table public.la_missions enable row level security;
alter table public.la_mission_school_targets enable row level security;
alter table public.la_user_mission_progress enable row level security;
alter table public.la_school_daily_metrics enable row level security;
alter table public.la_leaderboard_snapshots enable row level security;
alter table public.la_job_runs enable row level security;
alter table public.la_app_config enable row level security;

revoke all on public.la_users from anon, authenticated;
revoke all on public.la_user_keys from anon, authenticated;
revoke all on public.la_user_profiles from anon, authenticated;
revoke all on public.la_user_school_memberships from anon, authenticated;
revoke all on public.la_user_devices from anon, authenticated;
revoke all on public.la_activity_events from anon, authenticated;
revoke all on public.la_user_point_ledger from anon, authenticated;
revoke all on public.la_feed_items from anon, authenticated;
revoke all on public.la_review_photos from anon, authenticated;
revoke all on public.la_moderation_reports from anon, authenticated;
revoke all on public.la_moderation_actions from anon, authenticated;
revoke all on public.la_user_safety_flags from anon, authenticated;
revoke all on public.la_missions from anon, authenticated;
revoke all on public.la_mission_school_targets from anon, authenticated;
revoke all on public.la_user_mission_progress from anon, authenticated;
revoke all on public.la_school_daily_metrics from anon, authenticated;
revoke all on public.la_leaderboard_snapshots from anon, authenticated;
revoke all on public.la_job_runs from anon, authenticated;
revoke all on public.la_app_config from anon, authenticated;

grant select on public.la_feed_items to anon, authenticated;
grant select on public.la_review_photos to anon, authenticated;
grant select on public.la_missions to anon, authenticated;
grant select on public.la_mission_school_targets to anon, authenticated;
grant select on public.la_school_daily_metrics to anon, authenticated;
grant select on public.la_leaderboard_snapshots to anon, authenticated;
grant select on public.la_app_config to anon, authenticated;

drop policy if exists la_feed_items_public_read on public.la_feed_items;
create policy la_feed_items_public_read
  on public.la_feed_items
  for select
  to anon, authenticated
  using (
    visibility = 'public'
    and published_at is not null
    and published_at <= now()
    and (expires_at is null or expires_at > now())
  );

drop policy if exists la_review_photos_public_read on public.la_review_photos;
create policy la_review_photos_public_read
  on public.la_review_photos
  for select
  to anon, authenticated
  using (
    status = 'active'
    and moderation_status = 'approved'
    and deleted_at is null
  );

drop policy if exists la_missions_public_read on public.la_missions;
create policy la_missions_public_read
  on public.la_missions
  for select
  to anon, authenticated
  using (
    is_active = true
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

drop policy if exists la_mission_school_targets_public_read on public.la_mission_school_targets;
create policy la_mission_school_targets_public_read
  on public.la_mission_school_targets
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.la_missions m
      where m.id = mission_id
        and m.is_active = true
        and m.starts_at <= now()
        and (m.ends_at is null or m.ends_at > now())
    )
  );

drop policy if exists la_school_daily_metrics_public_read on public.la_school_daily_metrics;
create policy la_school_daily_metrics_public_read
  on public.la_school_daily_metrics
  for select
  to anon, authenticated
  using (true);

drop policy if exists la_leaderboard_snapshots_public_read on public.la_leaderboard_snapshots;
create policy la_leaderboard_snapshots_public_read
  on public.la_leaderboard_snapshots
  for select
  to anon, authenticated
  using (true);

drop policy if exists la_app_config_public_read on public.la_app_config;
create policy la_app_config_public_read
  on public.la_app_config
  for select
  to anon, authenticated
  using (is_public = true);

comment on table public.la_users is 'Canonical Lunch Arena user root for the new la_* layer. Existing production user_key rows remain unchanged.';
comment on table public.la_user_keys is 'Mapping from current app user_key values such as toss_* and fp_cid_* to canonical la_users.';
comment on table public.la_user_profiles is 'Future Lunch Arena user profile layer keyed by la_users.id. Does not replace production user_schools.';
comment on table public.la_user_school_memberships is 'New school membership/history layer. Mirrors user_schools logically without altering it.';
comment on table public.la_user_devices is 'Anonymous device/session registry for abuse detection and account continuity.';
comment on table public.la_activity_events is 'Append-only product activity stream used to rebuild feed, points, missions, and analytics.';
comment on table public.la_user_point_ledger is 'Append-only user points ledger. Reversals use negative rows instead of updates.';
comment on table public.la_feed_items is 'Curated public/school/meal feed items generated from activity events.';
comment on table public.la_review_photos is 'Review photo metadata for Cloudflare R2 objects in the lunch-arena bucket. Existing ratings.photo_url remains untouched.';
comment on table public.la_moderation_reports is 'User-submitted reports for reviews, comments, photos, users, schools, and feed items.';
comment on table public.la_moderation_actions is 'Moderator action audit log.';
comment on table public.la_user_safety_flags is 'Safety and abuse-control flags for anonymous user keys.';
comment on table public.la_missions is 'Configurable user and school missions.';
comment on table public.la_mission_school_targets is 'Optional mission-to-school targeting table for school-scoped missions.';
comment on table public.la_user_mission_progress is 'Per-user mission progress and reward state.';
comment on table public.la_school_daily_metrics is 'Daily school rollup for live ranking and home surfaces.';
comment on table public.la_leaderboard_snapshots is 'Versioned leaderboard results independent from production daily_rankings.';
comment on table public.la_job_runs is 'Structured operations log for sync, rollup, retention, and media jobs.';
comment on table public.la_app_config is 'Server-side feature/config values. Only rows with is_public are readable by anon/authenticated.';
