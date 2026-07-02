-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 103 of 134

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
