-- Lunch Arena student community v1.
-- Additive only: keeps existing production tables intact.

alter type public.la_activity_event_type add value if not exists 'community_post_created';
alter type public.la_activity_event_type add value if not exists 'community_post_deleted';
alter type public.la_activity_event_type add value if not exists 'community_comment_created';
alter type public.la_activity_event_type add value if not exists 'community_comment_deleted';
alter type public.la_activity_event_type add value if not exists 'community_reaction_created';
alter type public.la_activity_event_type add value if not exists 'community_reaction_deleted';

alter type public.la_activity_target_type add value if not exists 'community_post';
alter type public.la_activity_target_type add value if not exists 'community_comment';

create table if not exists public.la_community_posts (
  id uuid primary key default gen_random_uuid(),
  author_user_id uuid references public.la_users(id) on delete set null,
  author_user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint not null references public.schools(id) on delete cascade,
  anonymous_name text not null,
  title text not null,
  body text not null,
  visibility public.la_visibility not null default 'public',
  moderation_status public.la_moderation_status not null default 'unreviewed',
  comment_count integer not null default 0 check (comment_count >= 0),
  reaction_count integer not null default 0 check (reaction_count >= 0),
  rank_score numeric(12,4) not null default 0,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.la_community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.la_community_posts(id) on delete cascade,
  parent_comment_id uuid references public.la_community_comments(id) on delete cascade,
  author_user_id uuid references public.la_users(id) on delete set null,
  author_user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint not null references public.schools(id) on delete cascade,
  anonymous_name text not null,
  body text not null,
  visibility public.la_visibility not null default 'public',
  moderation_status public.la_moderation_status not null default 'unreviewed',
  reaction_count integer not null default 0 check (reaction_count >= 0),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (parent_comment_id is null or parent_comment_id <> id)
);

create table if not exists public.la_community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.la_community_posts(id) on delete cascade,
  comment_id uuid references public.la_community_comments(id) on delete cascade,
  user_id uuid references public.la_users(id) on delete set null,
  user_key text references public.la_user_keys(user_key) on delete set null,
  school_id bigint references public.schools(id) on delete set null,
  reaction text not null default 'like' check (reaction in ('like')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  check ((post_id is not null and comment_id is null) or (post_id is null and comment_id is not null))
);

create unique index if not exists idx_la_community_reactions_post_user
  on public.la_community_reactions(post_id, user_key, reaction)
  where post_id is not null;
create unique index if not exists idx_la_community_reactions_comment_user
  on public.la_community_reactions(comment_id, user_key, reaction)
  where comment_id is not null;

create index if not exists idx_la_community_posts_public_rank
  on public.la_community_posts(rank_score desc, created_at desc)
  where visibility = 'public' and deleted_at is null;
create index if not exists idx_la_community_posts_school_time
  on public.la_community_posts(school_id, created_at desc)
  where deleted_at is null;
create index if not exists idx_la_community_posts_author_time
  on public.la_community_posts(author_user_key, created_at desc);
create index if not exists idx_la_community_comments_post_time
  on public.la_community_comments(post_id, created_at asc)
  where deleted_at is null;
create index if not exists idx_la_community_comments_author_time
  on public.la_community_comments(author_user_key, created_at desc);

alter table public.la_community_posts enable row level security;
alter table public.la_community_comments enable row level security;
alter table public.la_community_reactions enable row level security;

revoke all on public.la_community_posts from anon, authenticated;
revoke all on public.la_community_comments from anon, authenticated;
revoke all on public.la_community_reactions from anon, authenticated;

grant select on public.la_community_posts to anon, authenticated;
grant select on public.la_community_comments to anon, authenticated;

drop policy if exists la_community_posts_public_read on public.la_community_posts;
create policy la_community_posts_public_read
  on public.la_community_posts
  for select
  to anon, authenticated
  using (
    visibility = 'public'
    and moderation_status in ('unreviewed', 'approved')
    and deleted_at is null
  );

drop policy if exists la_community_comments_public_read on public.la_community_comments;
create policy la_community_comments_public_read
  on public.la_community_comments
  for select
  to anon, authenticated
  using (
    visibility = 'public'
    and moderation_status in ('unreviewed', 'approved')
    and deleted_at is null
    and exists (
      select 1
      from public.la_community_posts p
      where p.id = post_id
        and p.visibility = 'public'
        and p.moderation_status in ('unreviewed', 'approved')
        and p.deleted_at is null
    )
  );

comment on table public.la_community_posts is 'Student community posts for the nationwide Lunch Arena feed.';
comment on table public.la_community_comments is 'Comments on Lunch Arena student community posts. V1 UI uses depth 1 only.';
comment on table public.la_community_reactions is 'Server-managed likes for community posts and comments.';
