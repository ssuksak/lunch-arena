-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 12 of 49

create index if not exists idx_ratings_school_created_menu
  on public.ratings(school_id, created_at desc, selected_menu_item)
  where selected_menu_item is not null;
