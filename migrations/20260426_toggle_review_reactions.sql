-- Migration: 리뷰 반응 취소 토글 지원
-- 작성: 2026-04-26
-- 목적: 좋아요/싫어요를 다시 누르면 취소할 수 있도록 취소 토큰 기반 삭제 정책 추가

alter table public.review_reactions
  add column if not exists cancel_token_hash text;

alter table public.review_reactions
  drop constraint if exists review_reactions_cancel_token_hash_check;
alter table public.review_reactions
  add constraint review_reactions_cancel_token_hash_check
  check (cancel_token_hash is null or cancel_token_hash ~ '^[a-f0-9]{64}$');

-- cancel_token_hash는 취소 권한 증명값이므로 REST select에서 노출하지 않는다.
revoke select on public.review_reactions from anon, authenticated;
grant select (id, rating_id, fingerprint, nickname, reaction, created_at)
  on public.review_reactions to anon, authenticated;

drop policy if exists review_reactions_delete on public.review_reactions;
create policy review_reactions_delete on public.review_reactions
  for delete to anon, authenticated
  using (
    cancel_token_hash is not null
    and cancel_token_hash = nullif((nullif(current_setting('request.headers', true), '')::json ->> 'x-reaction-cancel-token-hash'), '')
  );

comment on column public.review_reactions.cancel_token_hash is '반응 취소용 클라이언트 비밀 토큰의 SHA-256 해시. select 권한 없음';
comment on table public.review_reactions is '리뷰별 좋아요/싫어요 반응. 취소는 저장 당시 cancel_token_hash와 요청 헤더 해시가 일치할 때만 허용';