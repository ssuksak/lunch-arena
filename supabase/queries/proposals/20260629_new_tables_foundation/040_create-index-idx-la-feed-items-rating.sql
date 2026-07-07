-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 40 of 134

create index if not exists idx_la_feed_items_rating on public.la_feed_items(rating_id);
