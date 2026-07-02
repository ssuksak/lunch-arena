-- Source: supabase/proposals/20260629_new_tables_foundation.sql

-- Statement: 41 of 134

create index if not exists idx_la_review_photos_rating on public.la_review_photos(rating_id);
