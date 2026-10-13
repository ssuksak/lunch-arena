# 급식 낙서장 — Supabase 연결

Branch: `feature/education-office-feed`.
Project: `puwthqzbounohrdmacgo`.
Applied migration: `create_la_playground_weekly`.
SQL source: `supabase/proposals/playground-live.sql` (applied SQL archive).
Edge Function: playground v3 ACTIVE (verify_jwt=true), 기존 앱 user_key 방식으로 배포됨.
추가 migration: playground_one_entry_per_campaign_and_weekly_job.
SQL source: supabase/proposals/playground-one-entry-weekly.sql.

## 실제 저장 구조

- la_poem_words: 한글 3글자 제시어, enabled, 단어 중복 방지.
- la_poem_campaigns: 후보 FK + 단어 snapshot, 시작/작성 마감/평가 마감,
  시작 시각 unique, finalized_at + 공동 1등 ID/점수 snapshot.
- la_poems: UUID 작품, canonical la_users UUID 작성자, 회차 FK, 닉네임,
  세 줄, request UUID, 공개 상태, 반응별 집계, 생성 시각.
- la_poem_reactions: (작품,사용자) PK + like/dislike/funny.

네 테이블 모두 RLS 활성화, public/anon/authenticated 테이블 및 RPC 직접 접근 차단.
Edge Function만 서비스 역할로 접근한다. 사용자 UUID/세션 토큰을 공개 피드에
노출하지 않는다. 공개 응답에는 own boolean과 본인 반응만 포함한다.

## 기존 사용자 연결

기존 getUserId()의 toss_/fp_ 키를 각 요청에 함께 보낸다.
서버는 la_user_keys.user_id 또는 기존 la_users.primary_user_key의 UUID를
재사용한다. 처음 쓰는 사용자만 공통 사용자와 키 매핑을 생성한다.
읽기에서는 사용자 행을 만들지 않는다. 별도 놀이터 사용자, 세션 발급,
로그인, mTLS는 없다. 작품 author_id/반응 user_id는 공통 la_users.id다.
기존 사용자/리뷰/학교/프로필 기록은 변경하지 않는다.
키 소유권을 별도로 증명하지 않는 기존 서비스의 신뢰 방식은 유지한다.

## 주간 일정 (Asia/Seoul)

월요일 09:00 시작, 금요일 09:00 작성 마감, 다음 월요일 09:00 평가 마감.
작성 중: 작성+반응. 평가 중: 반응만. 종료: 작성·반응 모두 차단.
UTC cron `0 0 * * 1`가 종료 회차를 확정하고 현재 주 회차를 보장한다.
주간 생성은 advisory transaction lock + starts_at unique로 중복 방지한다.
사용 이력이 없는 활성 단어부터, 모두 사용했다면 가장 오래 전에 쓴 단어부터 순환.
후보가 없으면 새 회차를 생성하지 않는다. seed 12개는 기존 메뉴에서 확인한 단어다.

작성은 1회 요청 UUID로 재시도해도 중복되지 않는다. canonical 사용자당 회차별
한 작품 제한이며, 자기 작품 반응은 차단한다. 반응은 명시적 SET/취소(null),
trigger가 집계 수를 같은 트랜잭션에서 증감한다. 평가 종료 이후 RPC가 차단한다.

## 읽기 및 디자인

실제 API에서 10개+다음 페이지 확인용 1개만 조회한다. 최신순 커서는 timestamp+id,
인기순은 funny_count+timestamp+id. 인기순은 반응 변화 중 페이지 사이 순위가
달라질 수 있어 프론트가 중복 ID를 제거한다. 현재 1등은 전체 회차에서 별도 조회한다.
동점 카드의 응답은 최대 100개로 제한한다. 최종 1등은 확정 snapshot ID를 사용한다.

공책 디자인·일러스트·폰트는 assets/CSS에 고정. 제시어와 기간만 DB에서 바뀐다.
마감 안내는 API server_now와 브라우저 시계 차이를 보정하고 분 단위 로컬 갱신한다.
마감 카운트 표시 때문에 DB를 지속 polling하지 않는다.

## 검증

- 실제 feed API / 테이블 직접 접근 차단 / 무세션 쓰기 401: pass.
- DB transaction rollback: 등록, request 재시도, 중복 반응, 변경/취소,
  자기 작품 반응 차단, 작성·평가 마감, 종료 확정, 주간 생성 idempotency: pass.
- Edge isolated unit test: 서명된 토큰, 위조 토큰 거부, 클라이언트 UUID 무시: pass.
- Browser: 실제 갈비탕/작성 마감, 동적 작성 창, 최신/인기 요청, 오류 로그 없음.
- Static build: pass.
- 사용자 승인 후 Public API 실제 등록 → 중복 요청 → 반응 → 동시 변경 → 취소 →
  자기 작품 반응 차단 → 작성자 연결/UUID 비노출 → finally 숨김 처리: pass.
- 최신순·인기순·현재 1등에서 검증 작품 제외 확인. DB에서도 status=deleted,
  반응별 집계 모두 0, 남은 반응 0, 공개 작품 0 확인.
- 승인된 테스트 익명 작성자 2개와 숨김 작품 기록 1개는 DB에 남는다.
- 놀이터 내부의 중복 오늘급식 로고/서비스명은 제거했다. 토스 공통 내비게이션에
  브랜드가 표시된다는 사용자 설명에 따른 화면 수정이다.

Security Advisor의 새 테이블 관련 정보는 RLS Enabled No Policy뿐이다.
직접 접근을 허용하지 않고 서비스 역할만 사용하므로 의도된 구성이다.
신규 인덱스 unused INFO는 초기 작품이 0개인 시점의 결과다.

## 2026-10-13 출시 준비 검증

- 실제 DB 함수 BEGIN/ROLLBACK 검증: canonical 작성자, 멱등성, 접두 글자,
  일일 한도, 자기 반응 차단, 반응 변경/취소, 작성/평가 마감, 주간 중복 방지,
  공동 우승: PASS. 테스트 데이터는 롤백됐다.
- 현재 Edge 소스 VM 검증: 기존 매핑/primary 사용자 재사용, 첫 이용 공통 사용자,
  키 형식 검사, mTLS 호출 없음, 토큰 만료/위조/구형 토큰 거부,
  비활성 사용자 거부, 작품/반응 작성자 연결: PASS. DB는 모의 구현이다.
- npm run build: PASS, .ait 생성. 배포/심사/출시 성공을 의미하지 않는다.
- 운영 웹과 원격 master 확인: 놀이터 스크립트/탭 없음.
- 운영 DB 확인: 이전 테스트 사용자 3개, status=deleted 작품 2개, 반응 0개.
- 운영 playground 교체는 자동 승인 검토에서 두 번 거부됐다. 세션 방식 변경이
  기존 직접 API 클라이언트에 영향을 줄 수 있어 정확한 서버 교체 승인이 필요하다는
  이유다. 새 방식의 실제 API 작성/반응 검증은 아직 수행하지 못했다.
- master 병합과 정식 배포는 실제 API 검증 후 진행한다.

## 2026-10-13 배포 전 기능·안전성·무료 한도 감사

새 방식의 실제 API 쓰기/반응은 운영 v2와의 세션 계약 차이로 차단된다.
브라우저 등록 시 준비 중 안내가 표시됨을 확인했다. 이전 테스트 통과와
현재 변경의 운영 end-to-end 검증을 혼동하지 않는다. 이번 감사에서 실제
새 작품을 운영 DB에 등록하지 않았고 DB 함수 테스트 데이터는 롤백했다.

현재 코드의 기존 사용자 재사용과 토큰 검증은 모의 DB에서 통과했다.
키 소유권은 독립 검증하지 않으므로 기존 키를 알면 그 사용자 세션을
발급받을 수 있다. 토큰 위조 차단/RLS만으로 이 위험이 해소되지 않는다.
세션 발급·반응 요청의 별도 횟수 제한은 없으며 자유로운 키 생성으로
공통 사용자 테이블을 늘릴 수 있다. 사용자 요청에 따라 mTLS를 추가하지 않았다.

운영 읽기 검증: 기존 학교/급식/급식톡/랭킹, 교육청 필터, 놀이터
최신/인기 커서 문법 통과. 공개 작품이 0개인 만큼 다량 데이터에서의
페이지 이동/순위 동시 변경/동시 접속 성능이 검증됐다는 의미는 아니다.
DB 직접 접근과 RPC 직접 실행 차단 통과. 신규 테이블 Advisor 정보는
정책 없음(서비스 역할 전용)과 초기 미사용 인덱스다.

전체 DB 366,136,467 bytes, 놀이터 262,144 bytes. Free 한도는 DB 500MB,
egress 5GB, Edge 월 500,000회(조직 내 공유). 커스텀 la_users는
Supabase Auth의 MAU 숫자와 같은 의미가 아니다. 기존 급식 테이블 약304MB가
용량 대부분이다. Free에 자동 DB 백업은 포함되지 않는다.

최근 24시간 function_edge_logs POST 약3,709건, 5xx 0건.
30일 환산은 약111,270건이며 청구 사용량을 검증한 것이 아니다.
놀이터 평균 1인당 하루8요청 가정: 일500명=월120,000회,
1,000명=240,000회, 1,500명=360,000회, 2,000명=480,000회 추가.
기존 로그 환산을 더하면 각각 약231k/351k/471k/591k다.
조직의 다른 프로젝트 사용량과 실제 egress/DB 증가량은 별도 확인 필요.
따라서 초기 하루500~1,000명의 활동 사용자 시나리오는 호출 한도상 검토
가능하지만 수용 성능/무료 유지 보장이나 동시 접속 검증 결과가 아니다.

주간 cron은 여전히 10분 간격이다. 월요일09시KST로 바꿀 계획은 아직
적용되지 않았다. 작성량 인덱스(author_id,created_at)도 미적용이다.
앱은 초기 deep-link를 두 군데에서 로딩하던 중복 호출을 제거했다.
상세 구조화 결과: .qa/pre-release-audit-20261013.json (로컬 검증 자료).
공식 한도: https://supabase.com/pricing 및
https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations

## 최신 반영 결과 — 주간 1인 1작품

사용자 요청에 따라 주간 회차별 1인 1작품으로 바꿨다.
unique(campaign_id,author_id)는 숨김/삭제된 작품에도 적용된다.
동일 request_id 재시도는 원래 작품 ID를 반환한다. 다음 회차에는 다시 참여할 수 있다.
작성량 날짜 조회가 제거되어 author_id+created_at 인덱스는 필요하지 않다.

현재 1등/인기순은 feed 조회에서 funny_count 기준으로 결정한다.
주간 예약 작업은 월요일09:00 KST에 제시어를 교체하고 지난 회차를 확정한다.
cron은 10분 간격에서 주 1회로 실제 변경했다. 화면 작성·평가 마감은 RPC에서 검사한다.

실제 DB 롤백 테스트: 1회 참여, 재시도, 두 번째 작품 차단, 숨김 후 재등록 차단,
다음 회차 참여, 반응 변경/취소, 평가 마감, 공동 최종 우승, 주간 schedule: PASS.
실제 공개 API: 사용자 재사용, 1작품 제한, 참여 완료 응답, 재밌어요 1등,
동시 반응 변경/취소, 자기 반응 차단, UUID 비노출, 테스트 숨김: PASS.
브라우저 별도 QA 주소(8797): 작성 등록, 내 작품, 이번 주 참여 완료,
새로고침 후 작성 버튼 비활성: PASS. 테스트 작품은 해당 ID로 숨김 처리했다.
현재 미리보기(8796)의 사용자 참여 기록은 이번 브라우저 테스트에 사용하지 않았다.

이 최신 결과는 이전 기록의 서버 미반영/하루3작품/10분cron 설명을 대체한다.
master 병합·토스 정식 출시 결과는 별도로 확인해야 한다.
