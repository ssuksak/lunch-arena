-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 105 of 134

create policy la_review_photos_public_read
  on public.la_review_photos
  for select
  to anon, authenticated
  using (
    status = 'active'
    and moderation_status = 'approved'
    and deleted_at is null
  );
