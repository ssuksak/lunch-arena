# 오늘급식 v3.0 계획서

작성일: 2026. 6. 24.

## 1. 방향성

v3.0의 핵심은 오늘급식을 단순한 급식 조회 앱에서 **우리 학교 중심의 급식 커뮤니티**로 확장하는 것이다.

현재 앱은 “오늘 급식이 뭐지?”에 답한다. v3.0은 여기에 “우리 학교가 지금 얼마나 참여하고 있는지”, “우리 학교 대표 메뉴가 무엇인지”, “친구들이 실제로 어떻게 먹었는지”를 더한다.

한 줄 컨셉:

> 우리 학교 급식을 같이 평가하고, 우리 학교를 랭킹에 올리는 앱.

## 2. 주요 사용자

핵심 사용자는 10대 학생이다.

10대 사용자의 사용 맥락:

- 쉬는 시간, 점심 전후, 하교 전처럼 짧은 시간에 접속한다.
- 긴 설명보다 즉각적인 결과와 반응을 선호한다.
- “내 학교”, “친구들”, “랭킹”, “인증샷”에 반응한다.
- 리뷰 작성은 길면 이탈한다.
- 익명성과 가벼운 참여가 중요하다.

따라서 v3.0은 읽는 앱보다 **누르는 앱**이어야 한다.

## 3. 핵심 유저 플로우

### 3.1 첫 접속

```text
앱 접속
→ 랜덤 닉네임 자동 부여
→ 학교 선택
→ 우리 학교 오늘 급식 표시
→ 별점/대표 메뉴 선택
→ 참여도 상승 피드백
```

### 3.2 재방문

```text
앱 접속
→ 우리 학교 탭 바로 표시
→ 오늘/내일 급식 확인
→ 친구들 리뷰와 인증샷 확인
→ 별점/대표 메뉴/인증샷 참여
→ 우리 학교 참여도 순위 확인
```

### 3.3 공유 유입

```text
우리 학교 랭킹 확인
→ 공유
→ 친구 접속
→ 같은 학교 화면으로 유입
→ 리뷰 또는 인증샷 참여
→ 학교 참여도 상승
```

## 4. 탭 구조 제안

v3.0에서는 지도 탭의 우선순위를 낮추는 것이 좋다. 학생에게 가장 강한 동기는 “주변 학교 위치”보다 “우리 학교 급식과 순위”다.

추천 탭:

```text
홈
우리학교
인증샷
랭킹
내정보
```

### 홈

- 우리 학교 오늘 급식
- 오늘/내일 날짜 이동
- 빠른 리뷰 작성
- 우리 학교 참여도 요약
- 이번 달 대표 메뉴 요약

### 우리학교

- 학교 전용 피드
- 우리 학교 리뷰/댓글/인증샷
- 이번 달 참여도 순위
- 대표 메뉴 TOP 3
- 우리 학교 최근 활동

### 인증샷

- 사진 있는 리뷰 피드
- 우리 학교 인증샷 우선 노출
- 메뉴별 사진 모아보기
- 인증샷 많은 학교/메뉴 노출

### 랭킹

- 급식 점수 랭킹
- 참여도 랭킹
- 대표 메뉴 랭킹
- 인증샷 참여 랭킹

### 내정보

- 닉네임 수정
- 내 학교 변경
- 내가 쓴 리뷰/댓글/인증샷
- 학교 변경 횟수


## 4.1 홈 통계 카드 개편

현재 홈의 다음 3개 통계 카드는 사용자 관점에서 행동 유도가 약하다.

```text
등록 학교
오늘 급식
리뷰
```

이 정보는 운영 지표로는 의미가 있지만, 10대 사용자가 첫 화면에서 보고 싶은 핵심 정보는 아니다. 특히 “등록 학교 수”와 “오늘 급식 수”는 사용자가 바로 누르거나 참여하게 만드는 요소가 약하다.

v3.0에서는 이 영역을 **실시간 급식톡 미리보기**로 바꾸는 것이 좋다.

추천 홈 구성:

```text
우리 학교 오늘 급식

오늘 급식 어땠어?
별점 / 대표 메뉴 / 인증샷

실시간 급식톡                         전체보기 >
[전체] [우리학교] [인증샷]

- 은평메디텍고 · 익명의 급식러 · 5시간 전
  6/24 중식 · 별점 5
  미니주먹밥 · 셀프볼카츠버거 · 뿌링클하트감자
  좋아요 0 · 싫어요 0 · 댓글 0

- 정관고등학교 · 익명의 급식러 · 6시간 전
  6/24 중식 · 별점 1
  김치주물럭비빔밥 · 유부팽이장국
```

기존 통계는 완전히 제거하지 않고, 작은 보조 문장으로 이동한다.

```text
전국 11,623개 학교 · 오늘 급식 10,912개 · 리뷰 135개
```

위 문장은 검색창 아래 또는 홈 하단에 작게 배치한다.

명칭 후보:

- 실시간 급식톡
- 오늘의 급식 반응
- 다른 학교 반응
- 급식러들 반응

추천 명칭은 **실시간 급식톡**이다. “전체 리뷰”보다 커뮤니티 느낌이 강하고, 10대 사용자에게 덜 딱딱하다.

전체보기 진입 후 필터:

```text
전체
우리학교
사진있음
댓글많음
별점높음
별점낮음
```

이 변경의 목적:

- 첫 화면에서 바로 다른 학생들의 반응을 볼 수 있게 한다.
- 홈을 정적인 숫자 화면이 아니라 살아있는 피드로 만든다.
- 리뷰/댓글/인증샷 참여로 자연스럽게 이어지게 한다.
- v3.0의 “우리 학교 급식 커뮤니티” 방향과 맞춘다.

## 5. v3.0 MVP 범위

우선순위는 다음 순서가 적절하다.

1. 지도 탭 축소 또는 제거
2. 우리학교 탭 신설
3. 학교별 월간 참여도 랭킹
4. 인증샷 있는 리뷰 강조
5. 학교별 대표 메뉴 집계
6. 내정보 탭 정리
7. 리뷰 작성 UX 단순화

v3.0 MVP는 아래 3가지만 제대로 잡아도 충분하다.

```text
우리학교 탭
참여도 랭킹
인증샷 기반 대표 메뉴
```

## 6. 리뷰 작성 UX

현재 리뷰는 별점, 대표 메뉴, 한줄평, 사진 첨부를 지원한다. v3.0에서는 입력 부담을 줄여야 한다.

권장 순서:

```text
별점 탭
→ 가장 맛있던 메뉴 선택
→ 사진 있으면 첨부
→ 한줄평은 선택
→ 우리 학교 점수 올리기
```

버튼 문구도 “리뷰 등록”보다 다음이 더 적합하다.

```text
우리 학교 점수 올리기
인증샷으로 참여하기
대표 메뉴 뽑기
```

## 7. 참여도 점수 모델

초기 점수 모델:

| 행동 | 점수 |
| --- | ---: |
| 리뷰 작성 | +10 |
| 인증샷 첨부 | +15 |
| 댓글 작성 | +3 |
| 리뷰 반응 | +1 |
| 대표 메뉴 선택 | +2 |

월간 기준으로 집계한다.

참여도 화면 예시:

```text
우리 학교 이번 달 참여도 7위
리뷰 32 · 인증샷 11 · 댓글 58 · 반응 94
```

## 8. 대표 메뉴 모델

대표 메뉴는 `ratings.selected_menu_item`을 기반으로 집계할 수 있다.

초기 화면:

```text
이번 달 우리 학교 대표 메뉴
1위 닭강정
2위 마라탕
3위 돈까스
```

사진이 있는 리뷰와 결합하면 더 강해진다.

```text
실물 인증 많은 메뉴
사진 많은 대표 메뉴
이번 달 급식왕 메뉴
```

## 9. 현재 DB 구조 진단

확인한 Supabase 프로젝트:

- project id: `puwthqzbounohrdmacgo`
- 주요 테이블: `schools`, `meals`, `ratings`, `review_reactions`, `review_comments`, `user_schools`, `user_school_changes`, `battles`, `battle_votes`, `school_stats`, `daily_rankings`, `batch_state`
- 주요 Edge Functions: `sync-schools`, `sync-meals`, `geocode-schools`, `batch-sync-meals`

현재 데이터 규모:

- `meals`: 약 573,755건
- `ratings`: 135건
- `battles`: 87건
- `battle_votes`: 45건
- `user_school_changes`: 57건
- `user_schools`: 9건
- `review_reactions`: 3건
- `review_comments`: 0건

주의: `pg_stat_user_tables` 기준 `schools` 추정치가 0으로 나타났다. 실제 앱 통계는 약 11,623개 학교를 보여주므로 통계 미갱신 가능성이 있다. 운영 전 `ANALYZE public.schools` 또는 통계 상태 점검이 필요하다.

## 10. 현재 구조의 장점

### 10.1 급식 데이터 모델은 v3.0에 대체로 적합

`meals`는 이미 다음 구조를 가진다.

- 학교
- 날짜
- 식사 구분
- 메뉴 JSON
- 칼로리
- 자동 점수
- 자동 등급

그리고 `(school_id, meal_date, meal_type)` unique index가 있어 조식/중식/석식 확장도 가능하다.

### 10.2 리뷰와 반응 구조가 이미 존재

`ratings`, `review_reactions`, `review_comments`가 있어 커뮤니티 기능의 기본 뼈대는 있다.

`ratings.selected_menu_item`도 있어서 대표 메뉴 집계의 최소 데이터는 이미 있다.

### 10.3 사용자 학교 설정 이력도 존재

`user_schools`, `user_school_changes`가 있어 학교 변경 제한, 진단, 사용자별 학교 홈 제공이 가능하다.

## 11. 현재 구조의 한계

### 11.1 인증샷 저장소가 아직 준비되지 않음

앱에는 `ratings.photo_url`이 있고 프론트에는 사진 업로드 코드가 있지만, 실제 Storage bucket 조회 결과 bucket이 없다.

즉 현재 상태에서는 인증샷 업로드가 실패할 가능성이 높다.

v3.0 전에 필요:

- `reviews` 또는 `review-photos` Storage bucket 생성
- 공개 읽기 정책
- 제한된 업로드 정책
- 파일 크기 제한
- MIME type 제한

### 11.2 대표 메뉴 집계가 실시간 쿼리 의존

현재는 `ratings.selected_menu_item`을 직접 그룹핑하면 된다. 하지만 리뷰가 늘어나면 학교별/월별 대표 메뉴를 매번 계산하는 것은 느려질 수 있다.

추천:

- 초기 MVP: 실시간 집계
- 리뷰가 늘면: `school_menu_stats_monthly` 집계 테이블 도입

### 11.3 참여도 집계 테이블이 없음

현재 월간 참여도는 리뷰/댓글/반응 테이블을 매번 합산해야 한다.

MVP에서는 가능하지만 v3.0에서 홈/랭킹에 자주 노출되면 별도 집계 테이블이 필요하다.

추천:

- `school_engagement_daily`
- `school_engagement_monthly`

### 11.4 공개 쓰기 정책이 많음

Supabase Security Advisor가 다음을 경고했다.

- `battle_votes` insert가 `WITH CHECK true`
- `battles` insert/update가 사실상 공개
- `school_stats` all policy가 공개
- `schools` insert temp policy가 공개
- `weed_puller_rankings` insert가 공개

v3.0에서 학생 참여가 늘어나면 악의적 조작이나 실수성 데이터 오염이 커질 수 있다.

### 11.5 SECURITY DEFINER RPC 공개 경고

Advisor가 public schema의 `SECURITY DEFINER` 함수들이 anon/authenticated에서 실행 가능하다고 경고했다.

대상:

- `advance_meal_batch`
- `change_user_school`
- `enforce_user_school_change_limit`
- `find_battle_opponents`
- `get_monthly_school_change_count`

이 중 일부는 공개 호출이 의도된 것일 수 있다. 하지만 배치/내부 함수는 public RPC로 열려 있으면 위험하다.

### 11.6 사용자 소유권 검증이 약함

현재 `user_key`는 클라이언트가 보내는 값이다. Toss 환경에서는 `toss_<anonymousKey>`를 쓰지만, REST API 관점에서는 사용자가 임의 user_key로 요청할 수 있다.

특히 v3.0에서 참여도/랭킹 보상이 생기면 조작 유인이 커진다.

장기적으로는 다음 중 하나가 필요하다.

- Toss user key 검증을 서버/Edge Function에서 처리
- 모든 쓰기 작업을 Edge Function으로 통제
- anon REST 직접 insert 축소


### 11.7 오래된 급식 삭제 시 리뷰가 함께 사라지는 구조

현재 `ratings.meal_id`는 `meals.id`를 참조하며 `ON DELETE CASCADE`로 설정되어 있다. 또한 `review_comments`, `review_reactions`는 `ratings.id`를 `ON DELETE CASCADE`로 참조한다.

따라서 현재 구조에서 오래된 `meals`를 삭제하면 다음 일이 발생한다.

```text
meals 삭제
→ ratings 삭제
→ review_comments / review_reactions 삭제
```

무료 플랜에서는 `meals`가 가장 큰 테이블이므로 오래된 급식 데이터를 정리해야 할 가능성이 높다. 하지만 지금 구조로는 급식 삭제가 리뷰 삭제로 이어져 v3.0의 전체 리뷰 피드, 우리학교 피드, 대표 메뉴 기록이 손상된다.

v3.0 전에 리뷰가 식단 정보를 자체 보관하도록 바꾸는 것이 필요하다.
## 12. v3.0 권장 DB 확장안

### 12.1 리뷰 식단 스냅샷 저장

리뷰 작성 시점의 식단 정보를 `ratings`에 복사해 저장한다. 이렇게 하면 오래된 `meals`를 삭제해도 리뷰 피드와 대표 메뉴 기록을 유지할 수 있다.

권장 컬럼:

```sql
alter table public.ratings
  add column if not exists meal_date_snapshot date,
  add column if not exists meal_type_snapshot text,
  add column if not exists meal_menu_snapshot jsonb;
```

FK 정책도 바꾼다.

현재:

```sql
ratings.meal_id references public.meals(id) on delete cascade
```

권장:

```sql
alter table public.ratings
  drop constraint if exists ratings_meal_id_fkey;

alter table public.ratings
  add constraint ratings_meal_id_fkey
  foreign key (meal_id)
  references public.meals(id)
  on delete set null;
```

리뷰 저장 시 앱 또는 Edge Function은 다음 값을 함께 저장한다.

```text
meal_date_snapshot = meal.meal_date
meal_type_snapshot = meal.meal_type_label
meal_menu_snapshot = meal.menu
```

리뷰 표시 우선순위:

```text
1순위: meals 조인 데이터
2순위: ratings의 snapshot 데이터
```

효과:

- 오래된 `meals` 삭제 가능
- 리뷰/댓글/반응 보존 가능
- 전체 리뷰 피드 안정화
- 대표 메뉴 집계 안정화
- `ratings`만으로 리뷰 카드 렌더링 가능

주의:

- 리뷰당 메뉴 스냅샷 저장으로 `ratings` 용량은 늘어난다.
- 다만 리뷰 수가 크게 늘어도 전국 급식 원본을 무기한 보관하는 것보다 훨씬 작다.
- 기존 135개 리뷰는 마이그레이션 시 `meals`에서 스냅샷을 backfill해야 한다.

### 12.2 인증샷 테이블 분리

현재 `ratings.photo_url` 하나로는 여러 사진, 검수, 대표 이미지, 삭제 등을 다루기 어렵다.

권장:

```sql
create table public.review_photos (
  id bigserial primary key,
  rating_id bigint not null references public.ratings(id) on delete cascade,
  school_id bigint not null references public.schools(id),
  meal_id bigint references public.meals(id) on delete set null,
  user_key text not null,
  photo_url text not null,
  storage_path text not null,
  width int,
  height int,
  status text not null default 'active',
  created_at timestamptz default now()
);
```

필요 인덱스:

```sql
create index idx_review_photos_school_created on public.review_photos(school_id, created_at desc);
create index idx_review_photos_meal_created on public.review_photos(meal_id, created_at desc);
create index idx_review_photos_rating on public.review_photos(rating_id);
```

### 12.3 학교 월간 참여도 집계

권장:

```sql
create table public.school_engagement_monthly (
  month date not null,
  school_id bigint not null references public.schools(id),
  review_count int not null default 0,
  photo_count int not null default 0,
  comment_count int not null default 0,
  reaction_count int not null default 0,
  representative_menu_count int not null default 0,
  engagement_score numeric not null default 0,
  updated_at timestamptz default now(),
  primary key (month, school_id)
);
```

필요 인덱스:

```sql
create index idx_school_engagement_monthly_rank
on public.school_engagement_monthly(month, engagement_score desc);
```

### 12.4 학교 월간 대표 메뉴 집계

권장:

```sql
create table public.school_menu_stats_monthly (
  month date not null,
  school_id bigint not null references public.schools(id),
  menu_name text not null,
  pick_count int not null default 0,
  photo_count int not null default 0,
  avg_score numeric,
  updated_at timestamptz default now(),
  primary key (month, school_id, menu_name)
);
```

필요 인덱스:

```sql
create index idx_school_menu_stats_monthly_top
on public.school_menu_stats_monthly(month, school_id, pick_count desc, photo_count desc);
```

### 12.5 학교 피드용 뷰 또는 RPC

우리학교 탭은 여러 테이블을 조합한다.

- 오늘 급식
- 최근 리뷰
- 인증샷
- 대표 메뉴
- 참여도 순위

클라이언트가 여러 REST 요청을 날리는 방식은 초기에는 가능하지만, v3.0에서는 RPC 또는 Edge Function으로 묶는 것이 좋다.

권장:

```text
get_school_home(school_id, user_key)
```

반환:

- school
- today meals
- tomorrow meals
- recent reviews
- top menus this month
- engagement rank
- user participation summary

단, `SECURITY DEFINER`로 만들 경우 EXECUTE 권한과 user_key 검증을 반드시 설계해야 한다.

## 13. 보안/정책 개선 우선순위

v3.0 전에 해야 할 DB 정리:

1. `schools_insert_temp` 제거 또는 service role 전용으로 변경
2. `battles` 직접 insert/update 공개 정책 제거
3. `school_stats_all` 공개 all policy 제거
4. 배치용 RPC `advance_meal_batch` public execute revoke
5. 트리거 함수는 public RPC 호출 대상이 아니도록 execute revoke 유지 확인
6. 리뷰/댓글/반응 쓰기는 가능하면 Edge Function으로 이동
7. Storage bucket 생성 후 업로드 정책 제한

## 14. 성능 개선 우선순위

Advisor가 지적한 unindexed foreign key:

- `battle_votes.voted_school_id`
- `battles.school_a_id`
- `battles.school_b_id`
- `battles.meal_a_id`
- `battles.meal_b_id`
- `battles.winner_id`
- `daily_rankings.school_id`
- `ratings.school_id`

v3.0에서 학교별 리뷰/랭킹 조회가 늘어나므로 특히 아래는 먼저 추가하는 것이 좋다.

```sql
create index idx_ratings_school_created on public.ratings(school_id, created_at desc);
create index idx_ratings_school_meal_created on public.ratings(school_id, meal_id, created_at desc);
```

대표 메뉴 집계용:

```sql
create index idx_ratings_school_created_menu
on public.ratings(school_id, created_at desc, selected_menu_item)
where selected_menu_item is not null;
```

댓글/반응 집계용:

```sql
create index idx_review_reactions_rating_reaction on public.review_reactions(rating_id, reaction);
create index idx_review_comments_user_created on public.review_comments(user_key, created_at desc);
```

## 15. 지도 기능 판단

지도는 v3.0 메인 탭에서 제외하는 것이 좋다.

이유:

- 10대 핵심 사용 맥락과 거리가 있다.
- 지도는 탐색 기능이지 매일 접속 동기가 아니다.
- 지도 SDK 로딩과 위치 권한은 앱 진입 속도와 복잡도를 높인다.
- “우리학교”와 “랭킹”이 훨씬 강한 반복 사용 동기다.

대안:

- 지도 탭 제거
- 학교 검색 결과에서만 “지도에서 보기” 제공
- 내정보/학교 설정 내부 보조 기능으로 이동

## 16. 실행 로드맵

### Phase 1: v3.0 UX 뼈대

- 지도 탭 축소
- 우리학교 탭 추가
- 내정보 탭 추가
- 홈을 우리학교 중심으로 재배치

### Phase 2: 참여도 MVP

- 학교별 월간 참여도 집계 쿼리
- 참여도 TOP 3/내 학교 순위 노출
- 참여 액션 후 점수 상승 피드백

### Phase 3: 인증샷 MVP

- atings 식단 스냅샷 컬럼 추가
- `ratings.meal_id` FK를 `on delete set null`로 변경
- 기존 리뷰의 식단 스냅샷 backfill
- Storage bucket 생성
- `review_photos` 테이블 추가
- 사진 있는 리뷰 피드
- 우리학교 인증샷 우선 노출

### Phase 4: 대표 메뉴

- `selected_menu_item` 기반 집계
- 학교별 대표 메뉴 TOP 3
- 인증샷 많은 메뉴 강조

### Phase 5: 안정화

- 공개 쓰기 정책 정리
- RPC 권한 정리
- 집계 테이블 도입
- 성능 인덱스 추가

## 17. 결론

현재 DB는 v3.0 MVP를 시작하기에 충분한 기반이 있다. 다만 “사진”, “학교별 피드”, “참여도 랭킹”이 커지면 현재처럼 클라이언트에서 여러 테이블을 직접 읽고 쓰는 구조는 곧 한계가 온다.

v3.0의 핵심 DB 방향은 다음이다.

```text
ratings 중심
→ meal snapshot으로 리뷰 보존
→ review_photos 분리
→ school_engagement_monthly 집계
→ school_menu_stats_monthly 집계
→ 공개 쓰기 축소
→ 학교 홈 RPC/Edge Function 도입
```

가장 먼저 할 일:

1. Storage bucket과 `review_photos` 설계
2. `ratings.school_id, created_at` 인덱스 추가
3. 공개 쓰기 정책 정리
4. 우리학교 탭 MVP 구현

## 18. v3.0 DB 변경 적용 영향 진단

이 섹션은 v3.0 계획을 실제 DB에 적용할 때 기존 사용자와 기존 데이터에 미치는 영향을 점검한 결과다. 2026. 6. 24. 기준 실제 Supabase DB를 조회했다.

### 18.1 현재 리뷰 데이터 상태

현재 `ratings` 상태:

```text
전체 리뷰: 135개
meal_id가 있는 리뷰: 135개
meal_id가 없는 리뷰: 0개
존재하지 않는 meal_id를 참조하는 리뷰: 0개
selected_menu_item이 있는 리뷰: 0개
photo_url이 있는 리뷰: 0개
댓글 있는 리뷰: 29개
nickname이 저장된 리뷰: 1개
```

판단:

- 기존 리뷰는 모두 정상적인 `meals` row를 참조한다.
- 스냅샷 backfill은 현재 DB 기준으로 전량 가능하다.
- 기존 리뷰 중 대표 메뉴/사진 데이터는 거의 없으므로, v3.0 대표 메뉴/인증샷 기능은 새 데이터부터 본격적으로 쌓인다.

### 18.2 오래된 meals 삭제 시 영향

현재 `meals` 상태:

```text
전체 meals: 약 573,803건
최소 meal_date: 2025-06-30
최대 meal_date: 2026-08-31
30일 초과 meals: 321,973건
60일 초과 meals: 140,147건
90일 초과 meals: 254건
```

리뷰가 달린 오래된 급식:

```text
30일 초과 급식에 달린 리뷰: 7개
60일 초과 급식에 달린 리뷰: 5개
90일 초과 급식에 달린 리뷰: 1개
리뷰가 달린 가장 오래된 급식: 2026-03-18
```

판단:

- 지금 바로 60일 초과 `meals`를 삭제하면 현재 구조에서는 리뷰 5개가 함께 삭제된다.
- 스냅샷 + FK 변경 후에는 이 리뷰들을 보존할 수 있다.
- 삭제 정책 적용 전 반드시 기존 리뷰 스냅샷 backfill을 먼저 해야 한다.

### 18.3 FK 구조 영향

현재 주요 FK:

```text
ratings.meal_id → meals.id: ON DELETE CASCADE
review_comments.rating_id → ratings.id: ON DELETE CASCADE
review_reactions.rating_id → ratings.id: ON DELETE CASCADE
battles.meal_a_id → meals.id: NO ACTION
battles.meal_b_id → meals.id: NO ACTION
```

영향:

- `ratings.meal_id`만 `ON DELETE SET NULL`로 바꾸면 리뷰 삭제 문제는 해결된다.
- 하지만 `battles.meal_a_id`, `battles.meal_b_id`가 `NO ACTION`이라 오래된 `meals` 삭제가 배틀 참조 때문에 실패할 수 있다.
- 현재 모든 battle 87개가 meal을 참조하고 있고, 60일 초과 meal을 참조하는 battle은 6개다.

v3.0에서 오래된 `meals`를 삭제하려면 다음 중 하나가 필요하다.

```text
선택 A: battles도 meal snapshot을 저장하고 meal FK를 ON DELETE SET NULL로 변경
선택 B: 오래된 battles를 먼저 삭제하거나 보관 정책을 별도로 둠
선택 C: battles 기능을 v3.0에서 축소/제거하면서 battles 관련 데이터를 정리
```

v3.0 방향상 배틀 탭 우선순위가 낮아지므로, 추천은 C 또는 A다. 배틀을 유지하려면 A가 안전하다.

### 18.4 기존 사용자 영향

안전한 변경:

```text
ratings에 nullable snapshot 컬럼 추가
기존 ratings snapshot backfill
ratings.meal_id FK를 ON DELETE SET NULL로 변경
리뷰 조회 UI에 snapshot fallback 추가
```

위 변경은 기존 사용자에게 즉시 부정적 영향이 거의 없다.

이유:

- 컬럼을 nullable로 추가하면 기존 insert API가 깨지지 않는다.
- 기존 리뷰 135개는 모두 backfill 가능하다.
- `ratings.meal_id`는 이미 nullable이므로 `SET NULL`이 가능하다.
- `ratings_insert` RLS 정책은 snapshot 컬럼을 검사하지 않으므로 기존 리뷰 작성 흐름은 유지된다.

주의할 점:

- 프론트가 snapshot fallback을 적용하기 전에는 `meals` 삭제를 하면 오래된 리뷰 카드에서 식단 표시가 비어 보일 수 있다.
- 따라서 순서는 반드시 `DB 컬럼 추가 → backfill → 앱 fallback 배포 → FK 변경 → 보관 정책 적용`이어야 한다.

### 18.5 데이터 무결성 이슈

스냅샷 값을 프론트엔드가 직접 보내게 하면 사용자가 임의 메뉴/날짜를 조작할 수 있다.

추천 방식:

```text
리뷰 insert 시 DB trigger 또는 Edge Function이 meal_id를 기준으로 snapshot을 채운다.
클라이언트가 보낸 snapshot 값은 신뢰하지 않는다.
```

권장 trigger 개념:

```sql
create function public.set_rating_meal_snapshot()
returns trigger
language plpgsql
as $$
begin
  select m.meal_date, m.meal_type_label, m.menu
    into new.meal_date_snapshot, new.meal_type_snapshot, new.meal_menu_snapshot
  from public.meals m
  where m.id = new.meal_id;

  return new;
end;
$$;
```

이렇게 하면 기존 앱이 snapshot 컬럼을 몰라도 DB가 자동으로 보존 데이터를 채운다.

### 18.6 Unique constraint 영향

현재 `ratings`에는 다음 unique constraint가 있다.

```text
unique (meal_id, user_key)
```

`meal_id`가 `ON DELETE SET NULL`로 바뀌면 오래된 리뷰의 `meal_id`는 null이 될 수 있다. Postgres unique index에서 null은 서로 다른 값으로 취급되므로, 동일 사용자의 오래된 null meal 리뷰 여러 개가 존재할 수 있다.

판단:

- 기존 리뷰 보존에는 문제가 없다.
- 새 리뷰는 여전히 존재하는 meal에 작성되므로 중복 방지는 유지된다.
- 다만 장기적으로는 `ratings`에 `review_key` 또는 `(school_id, meal_date_snapshot, meal_type_snapshot, user_key)` 기반 중복 방지 전략을 검토할 수 있다.

### 18.7 적용 순서 권장안

기존 사용자 영향을 최소화하는 순서:

1. `ratings`에 snapshot 컬럼 추가, 모두 nullable
2. 기존 135개 리뷰에 대해 `meals` 조인으로 snapshot backfill
3. 새 리뷰 insert 시 snapshot을 자동 저장하는 trigger 추가
4. 앱 리뷰 렌더링을 `meals → snapshot` fallback 구조로 변경
5. `ratings.meal_id` FK를 `ON DELETE SET NULL`로 변경
6. `battles` 보관/축소/스냅샷 정책 결정
7. 오래된 `meals` 삭제 정책을 작은 범위로 테스트
8. 삭제 후 리뷰 피드, 내 활동, 학교별 리뷰, 전체 리뷰 정상 표시 확인

이 순서를 지키면 기존 사용자의 리뷰/댓글/반응은 보존하면서 무료 플랜의 DB 용량을 관리할 수 있다.
## 19. Supabase 즉시 반영과 토스 10시간 지연을 고려한 작업 전략

Supabase DB 변경은 적용 즉시 모든 사용자에게 반영된다. 반면 Apps in Toss 배포는 배포 요청 후 실제 사용자 앱 갱신까지 약 10시간이 걸릴 수 있다. 따라서 v3.0 작업은 DB와 앱을 동시에 바꾸는 방식이 아니라, 구버전 앱과 신버전 앱이 한동안 같은 DB를 함께 쓰는 상황을 전제로 설계해야 한다.

핵심 원칙은 다음과 같다.

```text
Expand → Deploy → Wait → Contract
```

즉, 먼저 DB를 안전하게 넓히고, 앱을 호환형으로 배포하고, 토스 반영 시간을 기다린 뒤, 마지막에 오래된 구조를 정리한다.

### 19.1 바로 적용 가능한 DB 변경

다음 변경은 기존 앱을 깨뜨릴 가능성이 낮으므로 앱 배포 전에 먼저 적용할 수 있다.

```text
nullable 컬럼 추가
새 테이블 추가
새 인덱스 추가
기존 데이터를 보존하는 backfill
기존 insert/update 흐름을 유지하는 trigger 추가
기존 정책보다 더 넓거나 동일한 읽기 호환 정책
```

v3.0 기준으로 먼저 적용 가능한 항목:

1. `ratings` snapshot 컬럼 추가
   - `meal_date_snapshot`
   - `meal_type_snapshot`
   - `meal_menu_snapshot`
2. 기존 리뷰 snapshot backfill
3. 새 리뷰 작성 시 `meal_id` 기준으로 snapshot을 채우는 trigger 추가
4. `ratings.school_id`, `ratings.created_at`, `review_comments.rating_id` 등 조회 성능용 index 추가
5. `review_photos` 같은 새 테이블 생성. 단, 기존 앱이 접근하지 않아도 문제가 없도록 RLS와 grant를 별도 점검한다.

이 단계에서는 기존 컬럼 삭제, `NOT NULL` 추가, 기존 RLS 강화, FK 삭제 정책 변경 후 즉시 데이터 삭제 같은 변경은 하지 않는다.

### 19.2 앱 배포 전 피해야 할 DB 변경

토스 구버전 앱이 최대 10시간 이상 남아 있을 수 있으므로 다음 변경은 앱 배포 전 또는 배포 직후 바로 적용하면 위험하다.

```text
기존 컬럼 삭제
기존 컬럼 이름 변경
기존 API 응답 shape 변경
기존 insert에 필요한 컬럼을 NOT NULL로 강화
기존 RLS를 더 엄격하게 변경
오래된 meals 일괄 삭제
ratings.meal_id FK 변경 후 즉시 retention 삭제 실행
battles가 참조 중인 meals 삭제
```

특히 현재 구조에서는 `ratings.meal_id`가 `ON DELETE CASCADE`이므로, snapshot/fallback 배포 전에 `meals`를 삭제하면 리뷰가 함께 삭제된다. 또한 `battles.meal_a_id`, `battles.meal_b_id`는 `NO ACTION`이라 오래된 `meals` 삭제 자체가 실패할 수 있다.

### 19.3 토스 배포용 앱 코드 원칙

앱은 한동안 구DB/신DB/부분 적용 DB를 모두 버틸 수 있어야 한다.

리뷰 식단 표시 원칙:

```text
1. meals 조인이 있으면 meals 기준으로 표시
2. meals가 없으면 ratings snapshot 기준으로 표시
3. 둘 다 없으면 "식단 정보 없음"으로 표시
```

새 기능 표시 원칙:

```text
review_photos 테이블이 없거나 권한 오류가 나도 리뷰 작성 자체는 가능해야 한다.
참여도 랭킹 집계가 없으면 기본 리뷰 피드만 보여준다.
대표메뉴 데이터가 없으면 메뉴명만 표시한다.
지도/배틀처럼 우선순위가 낮은 기능은 실패해도 홈/리뷰/내학교 흐름을 막지 않는다.
```

이렇게 만들면 DB 선작업, 토스 지연 반영, 일부 기능 비활성 상태에서도 기존 사용자가 급식 확인과 리뷰 작성 흐름을 계속 사용할 수 있다.

### 19.4 권장 운영 순서

v3.0 적용 시 권장 순서:

1. Supabase에 안전한 확장 변경 적용
   - nullable snapshot 컬럼 추가
   - 기존 리뷰 backfill
   - snapshot trigger 추가
   - 필요한 index 추가
2. 로컬에서 기존 기능 회귀 테스트
   - 학교 설정
   - 오늘/내일 급식
   - 리뷰 작성
   - 댓글/반응
   - 내 활동
3. 앱 코드를 fallback 구조로 수정
4. GitHub push
5. Apps in Toss 배포 요청
6. 최소 10시간, 권장 12~24시간 대기
7. 배포 반영 후 Supabase에서 정리성 변경
   - `ratings.meal_id`를 `ON DELETE SET NULL`로 변경
   - `battles` 보존/삭제/스냅샷 정책 적용
   - 오래된 `meals` 삭제를 소량으로 테스트
8. 문제가 없으면 retention 정책을 점진 적용

### 19.5 롤백 기준

DB를 먼저 넓히는 방식은 롤백도 쉽다.

- 앱 배포 전 문제가 생기면 새 컬럼/새 테이블을 사용하지 않으면 된다.
- 앱 배포 후 문제가 생기면 앱에서 snapshot fallback을 끄거나 기존 `meals` 기반 표시로 되돌릴 수 있다.
- 데이터 삭제는 되돌리기 어렵기 때문에, `meals` retention은 배포 안정화 후 가장 마지막에 진행한다.

따라서 v3.0의 첫 DB 작업은 "기존 사용자에게 영향 없는 추가형 변경"으로 제한하고, 실제 데이터 삭제/제약 강화는 토스 반영이 끝난 뒤 별도 단계로 진행한다.
## 20. 보안 취약성 점검 결과

점검일: 2026. 6. 24.

이 섹션은 현재 코드와 실제 Supabase 운영 DB를 함께 확인한 결과다. 이 점검에서는 DB를 변경하지 않았고, Supabase Advisor, RLS 정책, 공개 함수, 프론트 입력 처리, Storage 상태를 확인했다.

### 20.1 가장 우선 조치가 필요한 항목

#### 1. `user_schools`가 사실상 사용자 소유권을 검증하지 못함

현재 정책:

```text
user_schools_read: select true
user_schools_insert: user_key 형식과 source만 확인
user_schools_update: user_key 형식과 source만 확인
```

문제:

- `user_schools_read`가 전체 공개라 다른 사용자의 `user_key`, 학교, 닉네임을 조회할 수 있다.
- `user_schools_update`는 요청자가 해당 `user_key`의 소유자인지 확인하지 않는다.
- 현재 앱은 익명 REST 구조이므로, 누군가 다른 사용자의 `user_key`를 알면 학교/닉네임을 바꾸는 요청을 만들 수 있다.
- 과거 “학교가 자동으로 바뀌었다” 문제와 직접적으로 연결될 수 있는 구조다.

권장 조치:

```text
단기: user_schools 직접 upsert/update를 줄이고 change_user_school RPC로만 학교 변경
중기: user_schools select 결과에서 user_key 전체 노출 축소
중기: 닉네임 저장도 소유 검증 가능한 RPC로 이동
장기: Toss user key 검증 또는 서버 발급 세션 토큰 기반으로 전환
```

토스 배포 지연을 고려하면, 기존 앱이 깨지지 않도록 먼저 앱을 RPC 중심으로 수정하고 배포한 뒤 RLS를 강화해야 한다.

#### 2. `schools` 공개 insert 정책

Supabase Advisor 경고:

```text
public.schools policy schools_insert_temp: INSERT WITH CHECK true
```

문제:

- 누구나 `schools`에 임의 학교 데이터를 삽입할 수 있다.
- 학교 검색 결과 오염, 잘못된 학교 표시, 악성 문자열이 포함된 학교명/주소 유입 가능성이 있다.
- 프론트가 대부분 escape를 하고 있어 즉시 XSS 가능성은 낮지만, DB 오염 자체가 크다.

권장 조치:

```text
schools_insert_temp 제거
anon/authenticated의 schools insert/update/delete 권한 revoke
학교 추가는 Edge Function 또는 관리자 작업으로만 수행
```

#### 3. `school_stats` 공개 ALL 정책

Supabase Advisor 경고:

```text
public.school_stats policy school_stats_all: ALL true
```

문제:

- 누구나 학교 점수/통계 데이터를 삽입, 수정, 삭제할 수 있는 구조로 보인다.
- 랭킹, 점수, 참여도 표시가 조작될 수 있다.

권장 조치:

```text
public read만 허용
write/update/delete는 service_role 또는 내부 RPC만 허용
통계 갱신은 DB trigger, scheduled job, Edge Function으로 제한
```

#### 4. `battles`, `battle_votes` 공개 write/update 정책

Supabase Advisor 경고:

```text
battles_insert: true
battles_update: true
battle_votes_insert: true
```

문제:

- 배틀 생성, 승패, 투표 데이터가 조작될 수 있다.
- 무료 플랜에서는 대량 insert로 DB 용량/요청량을 소모시키는 공격 지점이 될 수 있다.
- v3.0에서 배틀 우선순위를 낮춘다면 먼저 닫아두는 편이 안전하다.

권장 조치:

```text
배틀 기능을 유지하지 않는다면 anon write/update 제거
유지한다면 battle 생성/투표를 RPC로 이동
중복 투표와 user_key 형식, 학교/meal 존재 여부를 DB에서 검증
```

### 20.2 공개 실행 가능한 SECURITY DEFINER 함수

Supabase Advisor가 다음 함수를 경고했다.

```text
advance_meal_batch()
change_user_school(...)
enforce_user_school_change_limit()
find_battle_opponents(...)
get_monthly_school_change_count(...)
```

문제:

- `SECURITY DEFINER`는 RLS를 우회할 수 있으므로 공개 실행 함수는 입력 검증이 매우 중요하다.
- `advance_meal_batch()`는 익명 호출로 배치 상태를 진행시키고 Edge Function을 호출할 수 있다.
- `change_user_school()`은 현재 `p_user_key`와 `p_ad_confirmed`를 클라이언트가 직접 보낸다. 즉, 사용자가 광고를 실제로 봤는지 서버가 검증하지 않는다.
- `get_monthly_school_change_count()`는 임의 `user_key`에 대한 변경 횟수를 조회할 수 있다.

권장 조치:

```text
advance_meal_batch: anon/authenticated execute revoke, cron/service role 전용으로 제한
change_user_school: 일단 유지하되 user_key 소유 검증 전략 필요
get_monthly_school_change_count: 민감도는 낮지만 user_key 노출 축소 후 재검토
find_battle_opponents: 배틀 기능 축소 시 execute revoke 검토
enforce_user_school_change_limit: trigger 함수라 직접 execute 권한 revoke
```

토스 앱이 익명 기반이라 `change_user_school`을 바로 닫으면 앱이 깨진다. 따라서 이 함수는 먼저 앱 구조를 바꾸고, 나머지 배치/배틀 함수부터 닫는 순서가 안전하다.

### 20.3 프론트 코드 보안 점검

긍정적인 부분:

- 사용자 입력 표시 대부분에 `escapeHtml()`이 적용되어 있다.
- 리뷰 댓글, 리뷰 본문, 메뉴명, 닉네임은 대체로 HTML escape 후 렌더링된다.
- `cancel_token_hash`는 select 권한에서 제외되어 좋아요 취소 토큰이 그대로 노출되지는 않는다.

주의할 부분:

```text
ratings.photo_url이 img src에 escape 없이 들어간다.
user_key가 클라이언트에서 생성/전송되며 REST API에서 임의로 바꿀 수 있다.
p_ad_confirmed가 클라이언트 boolean이라 광고 확인을 실제 보안 조건으로 볼 수 없다.
localStorage의 rated_* 값은 UX용일 뿐 중복 방지 보안 장치가 아니다.
```

권장 조치:

```text
photo_url은 DB check constraint 또는 업로드 테이블로 제한
review_photos 테이블을 만들 때 storage_path만 저장하고 public URL은 서버/앱에서 조합
사진 파일 타입, 크기, 경로 prefix 제한
리뷰/댓글/반응의 user_key 조작 가능성을 전제로 rate limit 또는 서버 검증 추가
```

### 20.4 Storage 관련

현재 `storage.buckets` 조회 결과 bucket이 없다.

판단:

- 지금은 사진 업로드가 실제로 저장되지 않으므로 Storage 오용 위험은 낮다.
- v3.0에서 인증샷 기능을 켜는 순간 Storage 정책이 핵심 보안 지점이 된다.

권장 설계:

```text
bucket: review-photos 또는 reviews
public bucket 사용 시 업로드는 제한, 읽기만 공개
파일 크기 제한: 예) 3MB 이하
mime 제한: image/jpeg, image/png, image/webp
경로 규칙: {user_key}/{rating_id}/{uuid}.jpg 형태
DB에는 storage_path만 저장
삭제/교체는 작성자 검증 또는 관리자만 허용
```

아동/청소년 사용 가능성을 고려하면 인증샷에는 신고/숨김/관리자 삭제 플로우가 필요하다.

### 20.5 Edge Function 보안

확인한 함수:

```text
sync-meals
batch-sync-meals
```

문제:

- 두 함수 모두 내부에서 `SUPABASE_SERVICE_ROLE_KEY`를 사용한다.
- `sync-meals`는 학교 코드와 날짜를 받아 `meals`를 upsert한다.
- 공개 호출이 가능하다면 외부 사용자가 대량 호출로 NEIS API와 DB 쓰기량을 소모시킬 수 있다.
- `batch-sync-meals`는 offset, batch_size, date_from, date_to를 body에서 받는다. 공개 호출이 가능하다면 배치 범위 조작이 가능하다.

권장 조치:

```text
일반 앱에서 필요한 sync-meals는 입력 범위 제한과 rate limit 필요
batch-sync-meals는 공개 호출 금지, cron/service role 전용 권장
batch_size 최대값 제한
date_from/date_to 허용 범위 제한
관리용 secret header 검증 추가 검토
```

### 20.6 성능 관련 보안 위험

Supabase Performance Advisor가 여러 unindexed FK를 경고했다.

주요 항목:

```text
ratings.school_id
battles.school_a_id / school_b_id
battles.meal_a_id / meal_b_id
battles.winner_id
battle_votes.voted_school_id
daily_rankings.school_id
```

성능 문제는 사용자가 늘면 장애와 비용 문제로 이어진다. 공개 API가 많은 구조에서는 느린 쿼리 자체가 남용 지점이 될 수 있다.

권장 조치:

```text
v3.0 전에 ratings.school_id, ratings.created_at 복합 인덱스 추가
배틀 유지 시 battles/battle_votes FK 인덱스 추가
배틀 축소 시 관련 테이블 write 차단 후 정리
```

### 20.7 우선순위별 실행안

#### 즉시 검토할 것

1. `schools_insert_temp` 제거 계획 수립
2. `school_stats_all`을 read-only 구조로 변경하는 계획 수립
3. `advance_meal_batch()` 공개 execute revoke 검토
4. `user_schools`의 전체 공개 select/update 구조 축소 계획 수립

#### v3.0 DB 선작업에 포함할 것

1. 리뷰 snapshot 컬럼 추가와 backfill
2. `ratings.school_id, created_at` index 추가
3. `review_photos` 설계 시 Storage path 기반 구조 적용
4. 공개 write 테이블을 RPC/Edge Function 중심으로 축소
5. 배틀 기능을 유지할지 제거할지 결정 후 RLS 정리

#### 토스 배포 이후 정리할 것

1. 기존 앱이 직접 쓰던 REST write 경로 축소
2. 불필요한 anon/authenticated table grant revoke
3. 공개 SECURITY DEFINER 함수 execute 권한 정리
4. 오래된 `meals` retention 적용 전 FK와 snapshot 검증

### 20.8 결론

현재 가장 큰 보안 리스크는 SQL injection이나 프론트 XSS보다는, 공개 익명 앱 구조에서 DB write 권한이 넓게 열려 있는 점이다. 특히 `user_schools`, `schools`, `school_stats`, `battles` 계열은 데이터 조작과 서비스 남용 가능성이 있다.

v3.0은 기능 추가보다 먼저 다음 방향을 잡는 것이 좋다.

```text
공개 read는 유지
공개 write는 최소화
학교/통계/배치 write는 서버 또는 RPC로 이동
사진은 Storage 정책과 moderation을 먼저 설계
user_key는 표시/조회 노출을 줄이고 소유 검증 경로를 강화
```
## 21. Supabase 무료티어 운영 가능성

점검일: 2026. 6. 26.

Supabase 무료티어에서 v3.0 MVP를 운영할 수 있는지 확인했다. 공식 문서 기준 Free Plan의 주요 quota는 다음과 같다.

```text
Database Size: 500 MB per project
Storage Size: 1 GB
Edge Function Invocations: 500,000 / month
Egress: 5 GB / month
Monthly Active Users: 50,000 MAU
Realtime Peak Connections: 200
```

출처: Supabase 공식 billing 문서, 2026. 6. 26. 확인.

### 21.1 현재 사용량

운영 DB 기준 현재 크기:

```text
전체 DB 크기: 약 222 MB
무료 DB 한도 대비: 약 44%
```

주요 테이블 크기:

```text
meals: 약 187 MB / 약 574,522건
schools: 약 4.3 MB
user_schools: 약 168 KB / 약 296건
ratings: 약 128 KB / 약 140건
user_school_changes: 약 112 KB / 약 87건
battles: 약 80 KB / 약 101건
battle_votes: 약 80 KB / 약 58건
review_reactions: 약 64 KB / 약 17건
review_comments: 약 48 KB / 0건
```

판단:

- 현재 무료티어 DB 한도 안에 있다.
- 실제 용량 대부분은 `meals`가 차지한다.
- 리뷰, 댓글, 좋아요, 사용자 학교 설정 데이터는 아직 매우 작다.
- 따라서 v3.0의 병목은 커뮤니티 기능보다 급식 원본 데이터 보관 기간과 사진 Storage다.

### 21.2 무료티어에서 충분한 기능

다음 기능은 텍스트/집계 중심이므로 무료티어에서 충분히 운영 가능하다.

```text
학교 설정
닉네임
리뷰 작성
댓글
좋아요/싫어요
전체 리뷰 피드
학교별 리뷰
내 활동
월간 참여도 랭킹
대표메뉴 집계
리뷰 식단 snapshot 저장
```

이 기능들은 row 수가 늘어도 개별 row가 작다. 적절한 index와 월간 집계 테이블을 두면 무료티어에서도 MVP 운영은 가능하다.

### 21.3 무료티어에서 조심해야 할 기능

#### 1. `meals` 장기 보관

현재 `meals`는 약 574,522건이고 약 187 MB를 사용한다. 전체 DB 222 MB 중 대부분을 차지한다.

위험:

```text
전국 학교 급식을 계속 누적
중식/석식/조식까지 모두 저장
과거 데이터를 장기 보관
```

이 구조를 유지하면 DB 500 MB 한도에 먼저 가까워진다.

권장:

```text
최근 60~90일 meals만 보관
오래된 meals 삭제 전 ratings snapshot 적용
리뷰는 ratings snapshot으로 보존
월간 랭킹/대표메뉴는 별도 집계 테이블에 보존
```

#### 2. 인증샷 사진

현재 Storage bucket은 없으므로 Storage 사용량은 사실상 없다. 하지만 v3.0에서 인증샷을 켜면 1 GB 한도가 빠르게 찰 수 있다.

대략적인 감각:

```text
사진 1장 1 MB라면 약 1,000장
사진 1장 500 KB라면 약 2,000장
사진 1장 300 KB라면 약 3,000장 이상
```

권장:

```text
클라이언트 업로드 전 이미지 압축
파일 크기 300~500 KB 목표
1리뷰 1사진 제한
학교/사용자별 일 업로드 제한
오래된 사진 정리 정책
신고/숨김/관리자 삭제 플로우
DB에는 public URL이 아니라 storage_path 저장
```

#### 3. Edge Function 호출

무료티어 Edge Function은 월 500,000회 호출 한도가 있다.

현재 앱은 급식 조회 시 `sync-meals`를 호출한다. 사용자가 많아지고 홈 접속마다 Edge Function을 호출하면 호출량이 빠르게 늘 수 있다.

권장:

```text
앱은 먼저 meals 테이블을 read
없는 경우에만 sync-meals 호출
같은 학교/날짜는 중복 호출 방지
주간 배치로 미리 채우기
batch-sync-meals는 공개 호출 금지, cron/service role 전용
```

#### 4. Egress

무료티어 Egress는 월 5 GB다. 텍스트 응답만 있으면 충분하지만, 사진을 public URL로 많이 보여주면 Storage와 Egress가 함께 증가한다.

권장:

```text
리뷰 피드에서는 썸네일만 표시
원본 이미지는 필요할 때만 로드
사진 lazy loading 유지
이미지 크기 제한
```

### 21.4 무료티어 유지 전략

v3.0 MVP를 무료티어로 유지하려면 다음 원칙을 지켜야 한다.

```text
1. meals는 보관 기간을 제한한다.
2. 리뷰는 snapshot으로 보존한다.
3. 사진은 압축하고 업로드 수를 제한한다.
4. Edge Function 호출은 캐시/배치 중심으로 줄인다.
5. 랭킹/대표메뉴는 매번 계산하지 말고 월간 집계 테이블을 사용한다.
6. 공개 write 권한을 줄여 악성 insert로 용량이 소모되지 않게 한다.
7. DB 용량이 350~400 MB에 도달하면 retention을 즉시 점검한다.
```

### 21.5 업그레이드가 필요한 신호

다음 상황이 오면 Pro 전환 또는 구조 변경을 검토한다.

```text
DB가 400 MB 이상으로 증가
Storage가 700 MB 이상 사용
Edge Function 호출이 월 30만 회 이상
사진 인증샷이 핵심 기능으로 자리잡음
일 방문자가 급격히 증가
리뷰 피드/랭킹 조회가 느려짐
```

판단:

- 현재 v3.0 MVP는 무료티어로 충분하다.
- 단, `meals` retention과 사진 제한 없이 확장하면 무료티어는 오래 버티기 어렵다.
- 가장 먼저 관리해야 할 것은 리뷰가 아니라 `meals`와 Storage다.

### 21.6 v3.0 반영 방향

v3.0은 기능을 크게 늘리기 전에 무료티어 친화 구조를 먼저 깔아야 한다.

```text
ratings snapshot 추가
meals 오래된 데이터 삭제 준비
review_photos는 storage_path 기반으로 설계
사진 압축/제한 적용
monthly engagement/menu stats 도입
sync-meals 호출 최소화
공개 write 권한 축소
```

결론:

```text
무료티어로 v3.0 MVP 운영 가능
하지만 사진과 meals 장기 보관은 제한 필수
사용자 증가 전 retention, snapshot, Storage 정책을 먼저 적용해야 함
```
## 22. 2026-06-26 v3 DB Foundation 적용 내역

사용자 증가와 데이터 누적에 대비해, 토스 배포본이 바로 깨지지 않는 범위의 DB 기초 공사를 먼저 적용했다. 이번 단계는 비파괴/additive 변경만 포함한다.

### 22.1 운영 DB 현황

```text
meals: 575,114건 / 약 197 MB
schools: 12,594건 / 약 7 MB
ratings: 142건
review_reactions: 18건
review_comments: 0건
```

판단:

- 현재 용량 압박은 리뷰가 아니라 `meals`가 만든다.
- `meals`는 2025-06-30부터 2026-08-31까지 존재한다.
- 30일 초과 데이터가 약 333,173건이므로, retention을 적용하면 무료티어 여유가 크게 늘어난다.
- 다만 기존 `ratings.meal_id -> meals.id`가 `ON DELETE CASCADE`라서 바로 삭제하면 리뷰도 같이 사라진다.

### 22.2 적용된 변경

마이그레이션 파일:

```text
migrations/20260626_v3_db_foundation.sql
```

적용 내용:

```text
1. ratings에 meal_date_snapshot, meal_type_snapshot, meal_menu_snapshot 추가
2. 기존 리뷰 142건 스냅샷 백필 완료
3. 새 리뷰 작성 시 식단 스냅샷을 자동 저장하는 trigger 추가
4. 학교별/전체 리뷰 조회용 index 추가
5. 댓글/반응/배틀 FK index 보강
6. school_engagement_monthly 추가
7. school_menu_stats_monthly 추가
8. refresh_school_monthly_rollups(date) 함수 추가
9. 이번 달 월간 집계 1회 생성
10. review_reactions_delete RLS 정책 성능 경고 수정
```

검증 결과:

```text
ratings_total: 142
missing_date_snapshot: 0
missing_type_snapshot: 0
missing_menu_snapshot: 0
school_engagement_monthly rows: 94
school_menu_stats_monthly rows: 7
```

### 22.3 아직 하지 않은 것

이번 단계에서는 아래 변경을 일부러 하지 않았다.

```text
ratings.meal_id FK를 ON DELETE SET NULL로 변경
오래된 meals 삭제
battles와 meals FK 변경 또는 과거 battle 삭제
공개 write RLS 정책 전면 잠금
sync-meals/batch-sync-meals 공개 호출 구조 변경
```

이유:

- Supabase DB 변경은 즉시 반영된다.
- 토스 앱 배포는 요청 후 약 10시간 뒤 갱신된다.
- 현재 배포본은 리뷰 표시에서 `meals` join에 의존한다.
- 지금 오래된 `meals`를 삭제하면 기존 앱에서 리뷰 식단 정보가 비거나, cascade 때문에 리뷰가 사라질 수 있다.

### 22.4 다음 단계

v3 앱 코드 배포 전:

```text
리뷰 조회 SELECT에 snapshot 컬럼 포함
meal join이 null이어도 snapshot으로 식단 표시
월간 참여도 랭킹은 school_engagement_monthly 사용
대표메뉴는 school_menu_stats_monthly 사용
```

v3 앱 배포 후 안정화 확인:

```text
ratings.meal_id FK를 ON DELETE SET NULL로 변경
battles의 meal_a_id, meal_b_id retention 정책 결정
60~90일 meals retention job 추가
monthly rollup refresh cron 추가
공개 write 정책을 Edge Function/RPC 중심으로 축소
```

권장 retention:

```text
초기: 최근 90일 meals 보관
안정화 후: 최근 60일 meals 보관 검토
삭제 전: ratings snapshot 누락 0건 확인 필수
```
### 22.5 배포 반영 방식 업데이트

운영 확인 결과, 오늘급식은 토스 앱에 정적 코드가 완전히 번들링되는 방식이라기보다 GitHub Pages URL을 토스 인앱 웹뷰가 여는 구조에 가깝다. 따라서 실제 변경 반영은 다음 흐름으로 보는 것이 더 정확하다.

```text
DB 변경: Supabase 적용 즉시 반영
프론트 변경: GitHub push -> GitHub Pages 배포 후 반영
토스 배포: 앱 등록/메타데이터/심사/노출 경로 갱신 성격이 강함
```

다만 여전히 주의할 점이 있다.

```text
GitHub Pages CDN 캐시가 남을 수 있음
토스 인앱 웹뷰 캐시가 이전 index.html을 들고 있을 수 있음
이미 앱을 열어둔 사용자는 새로고침/재진입 전까지 이전 JS를 볼 수 있음
Supabase는 즉시 바뀌므로 DB 파괴적 변경은 여전히 신중해야 함
```

이에 따라 v3 작업 전략을 다음처럼 조정한다.

```text
1. DB는 먼저 additive 변경만 적용한다.
2. 프론트는 snapshot fallback 등 호환 코드를 먼저 GitHub Pages에 배포한다.
3. 실제 웹뷰에서 새 코드가 반영되는지 확인한다.
4. 그 다음 FK 변경, meals retention, RLS 잠금 같은 위험 작업을 진행한다.
5. 파괴적 변경 전에는 최소 하루 정도 구버전 웹뷰 캐시 가능성을 고려한다.
```

정리하면, 토스 정식 배포를 기다리지 않아도 GitHub Pages를 통해 상당수 UI/JS 수정은 빠르게 반영될 수 있다. 하지만 Supabase 구조 변경은 즉시 전 사용자에게 영향을 주므로, DB 변경은 여전히 기존/신규 프론트가 모두 견딜 수 있는 순서로 진행해야 한다.
### 22.6 무료티어 지속 가능성 기준

2026-06-26 운영 DB 기준으로 다시 계산한 지속 가능성 기준이다.

현재 상태:

```text
전체 DB: 약 225 MB
meals: 약 188 MB / 약 575,121건
Free DB 500 MB 기준 사용률: 약 45%
월별 meals 증가량: 약 60~70 MB 수준
```

retention 미적용 시:

```text
meals를 계속 누적하면 3~5개월 내 DB 350~400 MB 위험권에 접근할 수 있다.
무료티어를 오래 유지하려면 무제한 보관은 피해야 한다.
```

90일 meals 보관 기준:

```text
예상 DB: 약 220~240 MB 수준
초기 v3 운영에는 적합
기능 안정화와 사용량 관찰 기간에 사용
```

60일 meals 보관 기준:

```text
예상 DB: 약 170~190 MB 수준
무료티어 장기 운영에 가장 적합
meals가 일정 크기에서 순환되므로 DB 증가 속도가 크게 줄어듦
```

운영 기준:

```text
초기 v3: 90일 보관
사용자 증가 확인 후: 60일 보관
DB 350 MB 도달: retention 즉시 점검
DB 400 MB 도달: 무료티어 한계 신호로 간주
Storage 700 MB 도달: 사진 정책 재검토
Edge Function 월 300,000회 이상: 호출 캐싱/배치 우선 점검
```

지속 가능성 판단:

```text
사진 없이 리뷰/댓글/좋아요 중심: 무료티어로 1년 이상 운영 가능성이 높음
학교 참여도/대표메뉴 집계 사용: 무료티어 운영 가능
인증샷 무제한 허용: Storage/Egress가 먼저 병목
meals 무제한 보관: 무료티어 장기 운영에 부적합
```

결론:

```text
60일 meals retention + ratings snapshot + 월간 집계 + 사진 제한을 지키면 무료티어에서도 v3 MVP를 장기간 운영할 수 있다.
```
### 22.7 v3 1차 프론트 개편 적용

2026-06-27 기준으로 GitHub Pages에 올릴 수 있는 프론트 1차 개편을 적용했다.

적용 내용:

```text
1. REVIEW_SELECT에 meal snapshot 컬럼 포함
2. 리뷰 카드 렌더링을 meals join → ratings snapshot fallback 구조로 변경
3. 내 댓글 화면의 원 리뷰 식단도 snapshot fallback 사용
4. 홈의 이번 달 리뷰 참여왕을 school_engagement_monthly 기반으로 조회
5. 집계 테이블이 비어 있거나 실패하면 기존 클라이언트 계산 방식으로 fallback
6. 내 학교가 있고 대표메뉴 집계가 있으면 이번 달 우리 학교 대표메뉴 섹션 표시
```

검증:

```text
Supabase REST school_engagement_monthly 조회: 200 OK
Supabase REST school_menu_stats_monthly 조회: 200 OK
Supabase REST ratings snapshot 포함 조회: 200 OK
로컬 JS 문법 검사: 통과
로컬 브라우저 홈 로드: 콘솔 error 없음
최신 리뷰 열기: 날짜/중식/메뉴 표시 정상
```

현재 retention 전 영향 점검:

```text
ratings_total: 149
ratings snapshot 누락: 0
60일 초과 meal 참조 리뷰: 5건
90일 초과 meal 참조 리뷰: 1건
battles_total: 112
60일 초과 meal 참조 battle: 6건
90일 초과 meal 참조 battle: 0건
ratings.meal_id: ON DELETE CASCADE 유지 중
battles.meal_a_id / meal_b_id: NO ACTION 유지 중
```

판단:

```text
프론트 snapshot fallback이 GitHub Pages에 반영된 뒤 FK 변경 가능
ratings.meal_id는 ON DELETE SET NULL로 변경 필요
battles는 과거 battle 삭제 또는 meal FK SET NULL 중 하나를 선택해야 함
그 전까지는 오래된 meals 삭제 금지
```
### 22.8 v3 retention foundation 적용

2026-06-27 기준으로 오래된 `meals`를 안전하게 줄이기 위한 2차 DB 구조 변경을 적용했다.

마이그레이션 파일:

```text
migrations/20260627_v3_retention_and_rollups.sql
```

적용 내용:

```text
1. ratings.meal_id FK를 ON DELETE CASCADE → ON DELETE SET NULL로 변경
2. battles.meal_a_id FK를 ON DELETE SET NULL로 변경
3. battles.meal_b_id FK를 ON DELETE SET NULL로 변경
4. 학교 1개/월 1개 단위로 월간 집계를 재계산하는 함수 추가
5. ratings insert/update/delete 시 월간 참여도/대표메뉴 집계 자동 갱신
6. review_comments insert/update/delete 시 월간 참여도 집계 자동 갱신
7. review_reactions insert/update/delete 시 월간 참여도 집계 자동 갱신
8. 이번 달 월간 집계 재생성
```

검증 결과:

```text
ratings_meal_id_fkey: ON DELETE SET NULL
battles_meal_a_id_fkey: ON DELETE SET NULL
battles_meal_b_id_fkey: ON DELETE SET NULL
trg_refresh_monthly_rollups_ratings: enabled
trg_refresh_monthly_rollups_review_comments: enabled
trg_refresh_monthly_rollups_review_reactions: enabled
현재 월 참여도 집계 rows: 100
현재 월 대표메뉴 집계 rows: 14
ratings snapshot 누락: 0
```

의미:

```text
이제 오래된 meals를 삭제해도 리뷰 자체는 삭제되지 않는다.
리뷰 카드는 GitHub Pages에 배포된 snapshot fallback으로 식단을 표시할 수 있다.
오래된 battle이 참조하던 meal은 삭제 시 null이 되므로 retention 삭제가 FK 때문에 실패하지 않는다.
월간 참여도 랭킹은 새 리뷰/댓글/좋아요 이후 자동 갱신된다.
```

아직 하지 않은 것:

```text
실제 오래된 meals 삭제
retention cron 등록
공개 write RLS 전면 잠금
사진 Storage 정책 적용
```

다음 권장 단계:

```text
1. 하루 정도 Pages/웹뷰 반영 상태 관찰
2. 90일 초과 meals부터 소량 삭제 테스트
3. 문제 없으면 90일 retention cron 적용
4. 안정화 후 60일 retention으로 축소 검토
```
### 22.9 내 리뷰 수정/삭제 기능 적용

2026-06-27 기준으로 사용자가 본인이 작성한 리뷰를 직접 수정하거나 삭제할 수 있는 흐름을 추가했다.

적용 내용:

```text
1. 리뷰 목록에서 현재 사용자 user_key와 리뷰 user_key가 같은 경우에만 수정/삭제 버튼 표시
2. 수정 시 별점, 대표 메뉴, 한줄평을 변경 가능
3. 삭제 시 해당 리뷰 삭제 및 rated_* localStorage 표시 제거
4. Supabase ratings update/delete RLS 정책 추가
5. update 권한은 score/comment/selected_menu_item/nickname 컬럼으로 제한
6. 댓글과 반응은 ratings 삭제 시 기존 FK cascade 구조에 따라 함께 삭제
```

마이그레이션 파일:

```text
migrations/20260627_review_edit_delete.sql
```

보안 메모:

```text
현재 구현은 토스/웹뷰 사용자 식별키를 x-review-owner-key 헤더로 보내고, DB 정책에서 ratings.user_key와 일치하는지 확인한다.
기존 익명 클라이언트 구조와 호환되는 방식이지만, 클라이언트가 user_key를 보유하는 구조이므로 v3 보안 강화 단계에서는 Edge Function 또는 수정 전용 토큰 기반 구조로 한 번 더 강화하는 것이 좋다.
```
### 22.10 v3 2차 UX 개편 및 90일 retention 소량 테스트

2026-06-27 기준으로 v3 다음 개편의 1차 적용을 진행했다.

DB retention 소량 테스트:

```text
기준일: 2026-03-29 이전 meals
삭제 전 90일 초과 meals: 353건
삭제한 meals: 10건
삭제 후 90일 초과 meals: 343건
전체 리뷰: 149건 유지
삭제된 meal을 참조하던 리뷰: 1건
해당 리뷰 결과: ratings.meal_id = null, snapshot 유지
삭제 후보 remaining: 0건
```

판단:

```text
ratings.meal_id ON DELETE SET NULL 구조가 정상 동작했다.
리뷰는 삭제되지 않고 ratings snapshot으로 표시 가능하다.
다음 단계는 90일 초과 meals를 더 큰 단위로 지우기 전, Pages 반영 후 리뷰 피드와 우리학교 피드를 한 번 더 관찰하는 것이다.
```

프론트 적용 내용:

```text
1. 홈을 정적 통계 카드 중심에서 내 학교 급식 + 실시간 급식톡 중심으로 개편
2. 홈 통계는 작은 보조 문장으로 축소
3. 하단 탭을 홈 / 우리학교 / 급식톡 / 랭킹으로 변경
4. 우리학교 탭을 신설하여 내 학교 급식, 대표메뉴, 학교 리뷰를 모아 표시
5. 전체 리뷰 피드는 급식톡 탭으로 분리
6. 지도/배틀은 하단 탭에서 제거하고 랭킹 하단 실험실 진입으로 이동
```

### 22.11 v3 DB 운영 안정화 적용

2026-06-27 기준으로 v3 MVP 이후 남은 DB 운영 작업 중 안전하게 바로 적용 가능한 항목을 반영했다.

적용 내용:

```text
1. review_comments 수정/삭제 RLS 정책 추가
2. 댓글 수정/삭제 권한은 x-comment-owner-key 헤더와 user_key 일치 조건으로 제한
3. cleanup_old_meals(keep_days, batch_size, dry_run) 함수 추가
4. cleanup_old_meals는 keep_days 60일 미만 실행을 거부하도록 안전장치 추가
5. cleanup_old_meals는 public/anon/authenticated 실행 권한을 회수하고 postgres/service_role만 실행 가능
6. refresh_recent_monthly_rollups(months) 함수 추가
7. 매일 03:40 KST 90일 초과 meals retention cron 등록
8. 매일 03:50 KST 최근 2개월 월간 집계 보정 cron 등록
```

마이그레이션 파일:

```text
migrations/20260627_v3_db_ops_hardening.sql
```

적용 직후 검증:

```text
cleanup_old_meals(90, 5000, true)
- ok: true
- cutoff_date: 2026-03-29
- candidate_count: 354
- deleted_count: 0

refresh_recent_monthly_rollups(2)
- ok: true
- months_refreshed: 2

cron 등록:
- cleanup-old-meals-90d: 40 18 * * * UTC
- refresh-recent-monthly-rollups: 50 18 * * * UTC
```

운영 메모:

```text
90일 retention cron은 실제 삭제를 수행한다.
ratings.meal_id는 ON DELETE SET NULL이고 ratings snapshot이 있으므로 리뷰 자체는 삭제되지 않는다.
다만 오래된 meals 원본 row는 제거되므로, 문제가 생기면 cron job을 즉시 비활성화하거나 unschedule한다.
댓글 수정/삭제 UI는 아직 앱에 붙이지 않았지만 DB 정책은 준비됐다.
```
