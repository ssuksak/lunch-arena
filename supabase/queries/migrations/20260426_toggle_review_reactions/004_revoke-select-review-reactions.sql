-- Source: migrations/20260426_toggle_review_reactions.sql

-- Statement: 4 of 9

-- cancel_token_hash는 취소 권한 증명값이므로 REST select에서 노출하지 않는다.
revoke select on public.review_reactions from anon, authenticated;
