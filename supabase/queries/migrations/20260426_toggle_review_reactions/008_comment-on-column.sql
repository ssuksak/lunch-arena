-- Source: migrations/20260426_toggle_review_reactions.sql

-- Statement: 8 of 9

comment on column public.review_reactions.cancel_token_hash is '반응 취소용 클라이언트 비밀 토큰의 SHA-256 해시. select 권한 없음';
