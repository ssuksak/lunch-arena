-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 19 of 49

create index if not exists idx_battles_winner_id
  on public.battles(winner_id);
