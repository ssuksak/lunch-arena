# Lunch Arena Work Log and Structure

작성일: 2026-06-28

## 1. 현재 상태

오늘급식은 GitHub Pages를 토스 인앱 웹뷰에서 여는 구조로 운영 중이다.

현재 판단:

- 프론트 변경은 `master` push 후 GitHub Pages에 반영되면 토스 인앱에도 대체로 반영된다.
- Supabase DB 변경은 적용 즉시 운영 사용자에게 영향을 준다.
- Apps in Toss AIT 번들도 재빌드/배포했고, 사용자 확인 기준 최신 AIT 반영은 확인됐다.
- v3 MVP 성격의 홈 UX, 우리학교 탭, 급식톡, 월간 참여도/대표메뉴 기반은 적용됐다.
- P0 중 남은 것은 retention cron 첫 자동 실행 이후 검증이다.

## 2. 주요 저장소/배포 구조

로컬 기존 위치:

```text
C:\Users\ghwld\Documents\lunch-arena
```

실제 Git repo:

```text
C:\Users\ghwld\Documents\lunch-arena\repo
```

요청된 새 작업 위치:

```text
G:\다른 컴퓨터\내 MacBook Pro\project\lunch-arena
```

새 위치로 이동 후 실제 Git repo:

```text
G:\다른 컴퓨터\내 MacBook Pro\project\lunch-arena\repo
```

운영 URL:

```text
https://ssuksak.github.io/lunch-arena/
```

주요 파일:

```text
repo/index.html
repo/V3_PLAN.md
repo/PROJECT_STATUS.md
repo/lunch-arena.ait
repo/migrations/
```

## 3. Git 상태

최근 주요 커밋:

```text
cefd29b Update V3 P0 verification notes
485efdc Add V3 todo checklist
cd8f7ea Add v3 DB operations hardening
0ef9118 Update AIT deployment bundle
fd05326 Fix scoped rating form refresh
1733bb1 Add v3 community UX updates
f7f4ab9 Prepare v3 meal retention
```

현재 기준 마지막 push는 `master -> origin/master`까지 완료됐다.

## 4. 프론트 적용 내용

적용 완료:

- 홈 UX를 내 학교 급식과 실시간 급식톡 중심으로 개편
- 기존 등록 학교/오늘 급식/리뷰 통계 카드는 보조 문장 성격으로 축소
- 우리학교 탭 신설
- 전체 리뷰 피드는 급식톡 탭으로 분리
- 지도/배틀 탭은 하단 탭에서 제거하고 랭킹 실험실 진입으로 정리
- 리뷰 카드에 학교명, 닉네임, 작성시간, 식단 날짜/중식/석식, 별점, 메뉴 표시
- 리뷰 좋아요/싫어요 토글
- 리뷰 댓글 작성
- 본인 리뷰 수정/삭제
- 리뷰 삭제 후 같은 급식 재평가 가능 처리
- 우리학교 탭 별점 선택 버그 수정
- 식단 snapshot fallback 렌더링 적용

아직 남은 프론트 작업:

- 댓글 수정/삭제 UI
- 내가 쓴 댓글 목록에서 원문 리뷰/학교로 이동하는 흐름 개선
- 급식톡 필터: 전체 / 우리학교 / 초중고 / 사진 있음
- 리뷰 작성 완료 후 피드 갱신과 완료 안내 UX 정리
- 버전 표시 또는 공지 캐시 대응 정리

## 5. Supabase 구조

Supabase project id:

```text
puwthqzbounohrdmacgo
```

주요 테이블:

```text
schools
meals
ratings
review_reactions
review_comments
user_schools
user_school_changes
battles
battle_votes
school_stats
daily_rankings
batch_state
school_engagement_monthly
school_menu_stats_monthly
```

중요한 구조 변경:

- `ratings`에 meal snapshot 컬럼 추가
  - `meal_date_snapshot`
  - `meal_type_snapshot`
  - `meal_menu_snapshot`
- 기존 리뷰 snapshot 백필 완료
- `ratings.meal_id` FK를 `ON DELETE SET NULL`로 변경
- `battles.meal_a_id`, `battles.meal_b_id`도 `ON DELETE SET NULL`로 변경
- 월간 참여도 집계 테이블 추가
  - `school_engagement_monthly`
- 월간 대표 메뉴 집계 테이블 추가
  - `school_menu_stats_monthly`
- ratings/comments/reactions 변경 시 월간 집계 갱신 트리거 추가

핵심 의도:

```text
오래된 meals를 삭제해도 ratings/review_comments/review_reactions는 보존한다.
리뷰 식단 표시는 meals join이 있으면 meals를 쓰고, 없으면 ratings snapshot을 쓴다.
```

## 6. Retention과 Cron

적용 완료:

- `cleanup_old_meals(keep_days, batch_size, dry_run)` 함수 추가
- keep_days 60일 미만 실행 거부 안전장치 추가
- public/anon/authenticated 실행 권한 회수
- service_role/postgres만 실행 가능
- `refresh_recent_monthly_rollups(months)` 함수 추가
- 매일 03:40 KST 90일 초과 meals retention cron 등록
- 매일 03:50 KST 최근 2개월 월간 집계 보정 cron 등록

Cron:

```text
cleanup-old-meals-90d
schedule: 40 18 * * * UTC
KST: 매일 03:40
command: select public.cleanup_old_meals(90, 5000, false);

refresh-recent-monthly-rollups
schedule: 50 18 * * * UTC
KST: 매일 03:50
command: select public.refresh_recent_monthly_rollups(2);
```

P0 점검 기준값:

```text
meals total: 575,513
90일 초과 meals: 354
ratings total: 149
meal_id = null 리뷰: 1
meal_id = null 리뷰 중 snapshot 보유: 1
이번 달 참여도 row: 100
이번 달 대표 메뉴 row: 14
```

2026-06-27 22:35 KST 기준 cron 실행 이력은 아직 없었다.
2026-06-28 03:40 KST 이후 첫 자동 실행 결과 확인이 필요하다.

## 7. DB 무료티어 운영 판단

현재 무료티어 운영은 가능하다.

주의할 병목:

- `meals` 장기 보관
- 인증샷 Storage
- Edge Function 반복 호출
- 공개 write 정책

권장 운영 기준:

```text
초기: 90일 meals retention
안정화 후: 60일 retention 검토
DB 350 MB 도달: retention 즉시 점검
DB 400 MB 도달: 무료티어 한계 신호
Storage 700 MB 도달: 사진 정책 재검토
Edge Function 월 300,000회 이상: 호출 캐싱/배치 우선 점검
```

## 8. 보안 메모

현재 사용자 식별은 토스 사용자 식별키 기반으로 정리했지만, 클라이언트가 식별값을 들고 요청하는 구조다.

현재 위험:

- 공개 anon REST write 정책이 일부 남아 있을 수 있음
- user_key 헤더 기반 수정/삭제는 조작 가능성이 완전히 사라지지 않음
- 참여도/랭킹이 커질수록 조작 유인이 증가함

향후 권장:

- 리뷰/댓글/반응 쓰기를 Edge Function 또는 RPC로 묶기
- Toss user key 검증을 서버 쪽에서 처리
- 공개 insert/update/delete 정책 축소
- 신고/숨김/차단 테이블 설계

## 9. 학교 데이터/NEIS

포항 지역 학교 조회 문제를 계기로 학교 데이터 누락 가능성을 점검했다.

적용 방향:

- 기존 NEIS API 기반 학교 수집/동기화 구조를 활용
- 누락 학교를 정기적으로 확인하고 추가하는 구조 추가
- `NEIS_API_KEY` 환경변수 등록 후 테스트 수행
- 학교 추가 시 해당 학교 급식도 이후 sync 대상에 포함되도록 확인 필요

관련 마이그레이션:

```text
migrations/20260626_school_sync_scheduler.sql
migrations/20260626_fix_meal_batch_total_count.sql
```

## 10. Apps in Toss/AIT

AIT 빌드/배포는 수행 완료.

최근 배포 링크:

```text
intoss-private://lunch-arena?_deploymentId=019f08a3-6230-7fd0-8a04-e05f42961736
```

AIT CLI 빌드 시 로컬 PATH에 Node/npm/npx가 없어서 임시 shim을 사용했다.

주의:

- `lunch-arena.ait`는 repo에 포함되어 있다.
- 토스 인앱 반영은 사용자 확인 기준 완료됐다.
- 다만 실제 운영 화면은 GitHub Pages 캐시와 토스 웹뷰 캐시 영향을 받을 수 있다.

## 11. 다음 작업 우선순위

P0:

- 2026-06-28 03:40 KST 이후 `cleanup-old-meals-90d` 첫 자동 실행 결과 확인
- retention 이후 `ratings_total`이 줄지 않았는지 확인
- `meal_id = null` 리뷰가 급식톡/우리학교 피드에서 정상 표시되는지 확인
- 월간 참여 랭킹이 cron 보정 후 정상 유지되는지 확인

P1:

- 댓글 수정/삭제 UI
- 급식톡 필터
- 우리학교 탭 대표 메뉴/참여 랭킹 UI 보강
- Supabase Advisor 재점검
- 공개 write 정책 축소 설계

P2:

- 인증샷 Storage bucket/정책
- 사진 압축/용량 제한
- 신고/숨김/관리자 처리
- 지도/배틀 유지 여부 결정

## 12. 새 작업 위치에서의 기본 명령

이동 후 작업 루트:

```powershell
Set-Location 'G:\다른 컴퓨터\내 MacBook Pro\project\lunch-arena\repo'
git status --short
```

로컬 서버:

```powershell
python -m http.server 8765
```

GitHub Pages 반영:

```powershell
git add .
git commit -m "<message>"
git push origin master
```

주의:

```text
DB 변경은 즉시 운영 반영된다.
프론트 변경은 GitHub Pages 배포와 웹뷰 캐시에 영향을 받는다.
retention/삭제/권한 잠금은 적용 전후 수치 확인이 필수다.
```
