-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 11 of 134

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
