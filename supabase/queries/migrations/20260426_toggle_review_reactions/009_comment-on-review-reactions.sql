-- Source: migrations/20260426_toggle_review_reactions.sql

-- Statement: 9 of 9

comment on table public.review_reactions is '리뷰별 좋아요/싫어요 반응. 취소는 저장 당시 cancel_token_hash와 요청 헤더 해시가 일치할 때만 허용';
