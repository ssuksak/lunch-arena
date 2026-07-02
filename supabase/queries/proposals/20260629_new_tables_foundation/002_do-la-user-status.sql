-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 2 of 134

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
