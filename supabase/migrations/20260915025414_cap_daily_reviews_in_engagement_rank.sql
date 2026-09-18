create or replace view public.la_school_engagement_monthly as
with ranked_reviews as (
  select r.*,
    row_number() over (
      partition by r.user_key, (r.created_at at time zone 'Asia/Seoul')::date
      order by r.created_at, r.id
    ) as daily_review_number
  from public.la_reviews r
), review_totals as (
  select date_trunc('month', created_at at time zone 'Asia/Seoul')::date as month,
    school_id, count(*)::integer as review_count
  from ranked_reviews where daily_review_number <= 3 group by 1, 2
), comment_totals as (
  select date_trunc('month', c.created_at at time zone 'Asia/Seoul')::date as month,
    r.school_id, count(distinct c.id)::integer as comment_count
  from public.la_review_comments c join public.la_reviews r on r.id = c.rating_id group by 1, 2
), reaction_totals as (
  select date_trunc('month', rr.created_at at time zone 'Asia/Seoul')::date as month,
    r.school_id, count(distinct rr.id)::integer as reaction_count
  from public.la_review_reactions rr join public.la_reviews r on r.id = rr.rating_id group by 1, 2
), photo_totals as (
  select date_trunc('month', p.created_at at time zone 'Asia/Seoul')::date as month,
    r.school_id, count(distinct p.id)::integer as photo_count
  from public.la_review_photos p join public.la_reviews r on r.id = p.rating_id
  where p.deleted_at is null group by 1, 2
), school_months as (
  select month, school_id from review_totals union
  select month, school_id from comment_totals union
  select month, school_id from reaction_totals union
  select month, school_id from photo_totals
)
select sm.month, sm.school_id,
  coalesce(rv.review_count, 0)::integer as review_count,
  coalesce(cm.comment_count, 0)::integer as comment_count,
  coalesce(rt.reaction_count, 0)::integer as reaction_count,
  coalesce(pt.photo_count, 0)::integer as photo_count,
  (coalesce(rv.review_count, 0) * 10 + coalesce(cm.comment_count, 0) * 3
    + coalesce(rt.reaction_count, 0) + coalesce(pt.photo_count, 0) * 5)::numeric as score
from school_months sm
left join review_totals rv using (month, school_id)
left join comment_totals cm using (month, school_id)
left join reaction_totals rt using (month, school_id)
left join photo_totals pt using (month, school_id);
