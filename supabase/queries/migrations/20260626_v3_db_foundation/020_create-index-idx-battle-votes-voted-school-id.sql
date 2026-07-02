-- Source: migrations/20260626_v3_db_foundation.sql

-- Statement: 20 of 49

create index if not exists idx_battle_votes_voted_school_id
  on public.battle_votes(voted_school_id);
