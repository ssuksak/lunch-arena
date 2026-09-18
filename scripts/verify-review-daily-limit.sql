-- Run as postgres; all fixtures are rolled back, including user metadata.
begin;
do $$
declare
  uid uuid;
  key1 text := 'fp_quota_sql_' || replace(gen_random_uuid()::text, '-', '');
  key2 text;
  mids bigint[];
  result jsonb;
  day date := (clock_timestamp() at time zone 'Asia/Seoul')::date;
begin
  key2 := key1 || '_alias';
  select array_agg(id) into mids from
    (select id from public.la_meals where school_id = 1863 order by id desc limit 4) m;
  assert array_length(mids, 1) = 4;
  insert into public.la_users(primary_user_key, metadata)
  values (key1, jsonb_build_object('review_daily_quota', jsonb_build_object('day', day - 1, 'used', 3)))
  returning id into uid;
  insert into public.la_user_keys(user_key, user_id, source, is_primary)
  values (key1, uid, 'fp', true), (key2, uid, 'fp', false);
  for i in 1..3 loop
    result := public.la_submit_review_limited(jsonb_build_object(
      'user_key', case when i = 3 then key2 else key1 end,
      'meal_id', mids[i], 'school_id', 1863, 'score', 4));
    assert (result->>'remaining')::integer = 3 - i, 'Rollover or alias quota mismatch';
  end loop;
  begin
    perform public.la_submit_review_limited(jsonb_build_object(
      'user_key', key2, 'meal_id', mids[4], 'school_id', 1863, 'score', 4));
    raise exception 'Fourth review unexpectedly accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'REVIEW_DAILY_LIMIT_REACHED' then raise; end if;
  end;
  assert ('2026-09-14 14:59:59+00'::timestamptz at time zone 'Asia/Seoul')::date = '2026-09-14'::date;
  assert ('2026-09-14 15:00:00+00'::timestamptz at time zone 'Asia/Seoul')::date = '2026-09-15'::date;
end;
$$;
rollback;
