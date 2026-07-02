-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 42 of 134

create index if not exists idx_la_review_photos_school_created on public.la_review_photos(school_id, created_at desc);
