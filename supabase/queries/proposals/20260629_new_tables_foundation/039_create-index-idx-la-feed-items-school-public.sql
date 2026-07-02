-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 39 of 134

create index if not exists idx_la_feed_items_school_public on public.la_feed_items(school_id, rank_score desc, published_at desc)
  where visibility = 'public';
