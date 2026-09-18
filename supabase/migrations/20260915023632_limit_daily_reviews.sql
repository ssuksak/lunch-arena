-- Only submit-review (service_role) may call this atomic insert.
create or replace function public.la_submit_review_limited(p_review jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_key text := p_review->>'user_key';
  v_user public.la_users%rowtype;
  v_rating public.la_reviews%rowtype;
  v_now timestamptz;
  v_day date;
  v_start timestamptz;
  v_used integer;
  v_existing integer;
begin
  -- Lock the canonical user, not the school or individual browser key.
  select u.* into v_user from public.la_users u
  join public.la_user_keys k on k.user_id = u.id
  where k.user_key = v_key for update of u;
  if not found then
    raise exception using errcode = 'P0001', message = 'REVIEW_USER_NOT_FOUND';
  end if;
  v_now := clock_timestamp();
  v_day := (v_now at time zone 'Asia/Seoul')::date;
  v_start := v_day::timestamp at time zone 'Asia/Seoul';

  if exists (select 1 from public.la_reviews r
    where r.user_key = v_key and r.meal_id = (p_review->>'meal_id')::bigint) then
    raise exception using errcode = '23505', message = 'REVIEW_ALREADY_EXISTS';
  end if;

  select count(*) into v_existing from public.la_reviews r
  join public.la_user_keys k on k.user_key = r.user_key
  where k.user_id = v_user.id and r.created_at >= v_start
    and r.created_at < v_start + interval '1 day';
  v_used := greatest(v_existing, case
    when v_user.metadata->'review_daily_quota'->>'day' = v_day::text
    then coalesce((v_user.metadata->'review_daily_quota'->>'used')::integer, 0)
    else 0 end);
  if v_used >= 3 then
    raise exception using errcode = 'P0001', message = 'REVIEW_DAILY_LIMIT_REACHED';
  end if;

  insert into public.la_reviews
    (meal_id, school_id, score, user_key, nickname, comment, selected_menu_item, photo_url, created_at)
  values
    ((p_review->>'meal_id')::bigint, (p_review->>'school_id')::bigint,
     (p_review->>'score')::integer, v_key, p_review->>'nickname', p_review->>'comment',
     p_review->>'selected_menu_item', p_review->>'photo_url', v_now)
  returning * into v_rating;

  -- Persist the allowance independently of reviews so deleting does not replenish it.
  update public.la_users set metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object('review_daily_quota', jsonb_build_object('day', v_day, 'used', v_used + 1))
  where id = v_user.id;
  return jsonb_build_object('rating', to_jsonb(v_rating), 'remaining', 2 - v_used,
    'limit', 3, 'reset_at', v_start + interval '1 day');
end;
$$;
revoke all on function public.la_submit_review_limited(jsonb) from public, anon, authenticated;
grant execute on function public.la_submit_review_limited(jsonb) to service_role;
