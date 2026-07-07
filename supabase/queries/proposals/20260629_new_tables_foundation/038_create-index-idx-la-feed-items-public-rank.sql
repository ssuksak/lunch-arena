-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 38 of 134

create index if not exists idx_la_feed_items_public_rank on public.la_feed_items(feed_scope, rank_score desc, published_at desc)
  where visibility = 'public';
