-- Storage cleanup step 2: drop legacy (pre-LA) runtime tables and their functions.
-- Runtime has used la_* tables only since 2026-07-07 (commit bc90edb); legacy writes stopped 2026-07-09.
-- Full data backup + schema snapshot: D:\Data\43_LA\backup\20261006\ (see rollback\step2_rollback.md)
-- No CASCADE: any unexpected dependency aborts the whole migration.
-- Kept on purpose: batch_state, school_sync_state (used by the LA sync cron).

drop table
  public.battle_votes,
  public.battles,
  public.review_reactions,
  public.review_comments,
  public.ratings,
  public.user_school_changes,
  public.user_schools,
  public.daily_rankings,
  public.school_stats,
  public.weed_puller_rankings,
  public.school_menu_stats_monthly,
  public.school_engagement_monthly,
  public.meals,
  public.schools;

drop function
  public.find_battle_opponents(double precision, double precision, text, bigint, date, integer),
  public.fill_rating_meal_snapshot(),
  public.change_user_school(text, text, bigint, text, boolean),
  public.get_monthly_school_change_count(text, date),
  public.enforce_user_school_change_limit(),
  public.log_user_school_change(),
  public.trg_refresh_monthly_rollups_from_child(),
  public.trg_refresh_monthly_rollups_from_rating(),
  public.refresh_recent_monthly_rollups(integer),
  public.refresh_school_monthly_rollups(date),
  public.refresh_school_monthly_rollup_for_school(date, bigint);
