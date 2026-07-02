-- Student community operational hardening.
-- Keeps browser writes closed and moves counter/rank updates into atomic DB functions.

alter type public.la_activity_event_type add value if not exists 'community_content_auto_hidden';

create or replace function public.la_community_rank_score(
  p_reaction_count integer,
  p_comment_count integer,
  p_created_at timestamptz
)
returns numeric
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select (
    greatest(coalesce(p_reaction_count, 0), 0) * 2
    + greatest(coalesce(p_comment_count, 0), 0)
    + greatest(0, 48 - greatest(0, extract(epoch from (now() - coalesce(p_created_at, now()))) / 3600)) / 48
  )::numeric(12,4);
$$;

revoke execute on function public.la_community_rank_score(integer, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.la_community_rank_score(integer, integer, timestamptz)
  to postgres, service_role;

create or replace function public.la_increment_community_comment_count(
  p_post_id uuid,
  p_delta integer default 1
)
returns table(comment_count integer, reaction_count integer, rank_score numeric)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  return query
  update public.la_community_posts p
  set comment_count = greatest(0, p.comment_count + p_delta),
      rank_score = public.la_community_rank_score(p.reaction_count, greatest(0, p.comment_count + p_delta), p.created_at),
      updated_at = now()
  where p.id = p_post_id
    and p.visibility = 'public'
    and p.moderation_status in ('unreviewed', 'approved')
    and p.deleted_at is null
  returning p.comment_count, p.reaction_count, p.rank_score;
end;
$$;

revoke execute on function public.la_increment_community_comment_count(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.la_increment_community_comment_count(uuid, integer)
  to postgres, service_role;

create or replace function public.la_increment_community_reaction_count(
  p_target_type text,
  p_target_id uuid,
  p_delta integer
)
returns table(reaction_count integer, rank_score numeric)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if p_target_type = 'post' then
    return query
    update public.la_community_posts p
    set reaction_count = greatest(0, p.reaction_count + p_delta),
        rank_score = public.la_community_rank_score(greatest(0, p.reaction_count + p_delta), p.comment_count, p.created_at),
        updated_at = now()
    where p.id = p_target_id
      and p.visibility = 'public'
      and p.moderation_status in ('unreviewed', 'approved')
      and p.deleted_at is null
    returning p.reaction_count, p.rank_score;
  elsif p_target_type = 'comment' then
    return query
    update public.la_community_comments c
    set reaction_count = greatest(0, c.reaction_count + p_delta),
        updated_at = now()
    where c.id = p_target_id
      and c.visibility = 'public'
      and c.moderation_status in ('unreviewed', 'approved')
      and c.deleted_at is null
    returning c.reaction_count, null::numeric;
  else
    raise exception 'invalid community target type: %', p_target_type;
  end if;
end;
$$;

revoke execute on function public.la_increment_community_reaction_count(text, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.la_increment_community_reaction_count(text, uuid, integer)
  to postgres, service_role;

create index if not exists idx_la_community_posts_school_public_rank
  on public.la_community_posts(school_id, rank_score desc, created_at desc)
  where visibility = 'public'
    and moderation_status in ('unreviewed', 'approved')
    and deleted_at is null;

create index if not exists idx_la_community_posts_global_public_rank
  on public.la_community_posts(rank_score desc, created_at desc)
  where visibility = 'public'
    and moderation_status in ('unreviewed', 'approved')
    and deleted_at is null;

create unique index if not exists idx_la_moderation_reports_community_key_dedupe
  on public.la_moderation_reports(reporter_user_key, target_type, target_id, reason)
  where reporter_user_key is not null
    and target_type in ('community_post', 'community_comment');

create index if not exists idx_la_moderation_reports_community_open_target
  on public.la_moderation_reports(target_type, target_id, created_at desc)
  where status in ('open', 'reviewing')
    and target_type in ('community_post', 'community_comment');
